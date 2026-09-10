import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function compile(path) {
  const source = (await readFile(new URL(path, import.meta.url), "utf8")).replace("import.meta.env.VITE_API_URL", '"/api"');
  return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText;
}

function domElement() {
  return { className: "", style: {}, textContent: "", set innerHTML(_) { throw new Error("Untrusted HTML sink used"); } };
}

async function clientContext() {
  const window = new EventTarget();
  const removed = [];
  window.localStorage = { removeItem: (key) => removed.push(key), getItem: () => assert.fail("Auth token read from storage"), setItem: () => assert.fail("Auth token stored") };
  const calls = [], replies = [];
  const context = vm.createContext({ exports: {}, window, document: { createElement: domElement }, Event, CustomEvent, Headers, FormData, Response, URL,
    fetch: async (url, options) => {
      calls.push({ url, options });
      assert.ok(replies.length, `Unexpected request: ${url}`);
      const reply = replies.shift();
      return typeof reply === "function" ? reply() : reply;
    }
  });
  vm.runInContext(await compile("../src/api.ts"), context);
  return { ...context.exports, window, calls, replies, removed };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });
}
function session(id = "synthetic-session-id") {
  return { user: { id: 1, email: "member@example.org", role: "user", is_active: true }, session_id: id,
    csrf_token: "synthetic-session-csrf", expires_at: "2099-01-01T00:00:00Z" };
}

async function login(client) {
  client.replies.push(json({ csrf_token: "synthetic-login-csrf" }), json(session()));
  return client.api.login("member@example.org", "synthetic-password");
}

test("login uses HttpOnly cookie transport, in-memory CSRF and removes the obsolete token", async () => {
  const client = await clientContext();
  assert.equal((await login(client)).role, "user");
  assert.deepEqual(client.removed, ["gsc_token"]);
  assert.equal(client.calls[0].url, "/api/auth/csrf");
  assert.equal(client.calls[1].options.headers.get("X-CSRF-Token"), "synthetic-login-csrf");
  client.replies.push(json({ id: 1 }));
  await client.api.createUrgency({ patient_name: "Synthetic patient" });
  assert.equal(client.calls[2].options.headers.get("X-CSRF-Token"), "synthetic-session-csrf");
  for (const { options } of client.calls) {
    assert.equal(options.credentials, "include");
    assert.equal(options.cache, "no-store");
    assert.ok(!new Headers(options.headers).has("Authorization"));
  }
});

test("concurrent mutations share the CSRF handshake and preserve multipart boundaries", async () => {
  const client = await clientContext();
  client.replies.push(json({ csrf_token: "synthetic-csrf" }), json([]), json([]));
  await Promise.all([client.api.previewDossiers([]), client.api.previewPlanning("2026-09-10", [])]);
  assert.equal(client.calls.filter(({ url }) => url.endsWith("/auth/csrf")).length, 1);
  for (const { options } of client.calls.slice(1)) {
    assert.ok(options.body instanceof FormData);
    assert.equal(options.headers.get("content-type"), null);
  }
});

test("401 and CSRF failures clear the session without retrying mutations", async () => {
  for (const failure of [json({ detail: "Expired" }, 401), json({ code: "csrf_failed" }, 403)]) {
    const client = await clientContext();
    await login(client);
    let ended = 0;
    client.window.addEventListener(client.SESSION_ENDED_EVENT, () => ended++);
    client.replies.push(failure);
    await assert.rejects(client.api.createUrgency({}), client.ApiError);
    assert.equal(ended, 1);
    assert.equal(client.calls.length, 3);
  }
});

test("logout revokes at the server; a network failure does not falsely report logout", async () => {
  const client = await clientContext();
  await login(client);
  let ended = 0;
  client.window.addEventListener(client.SESSION_ENDED_EVENT, () => ended++);
  client.replies.push(() => { throw new TypeError("Synthetic offline"); });
  await assert.rejects(client.api.logout());
  assert.equal(ended, 0);
  client.replies.push(new Response(null, { status: 204 }));
  await client.api.logout(true);
  assert.equal(ended, 1);
  assert.equal(client.calls.at(-1).url, "/api/auth/logout-all");
});

test("late responses from a logged-out session are discarded", async () => {
  const client = await clientContext();
  await login(client);
  let release;
  client.replies.push(() => new Promise((resolve) => { release = resolve; }));
  const pending = client.api.wzcs();
  client.clearSessionState();
  release(json([{ name: "Synthetic private record" }]));
  await assert.rejects(pending, (err) => err.status === 409);
});

test("a different session in another tab cannot populate the current dashboard", async () => {
  const client = await clientContext();
  await login(client);
  client.replies.push(json([], 200, { "X-Session-Id": "another-session" }));
  await assert.rejects(client.api.wzcs(), (err) => err.status === 401);
});

test("Excel downloads use the same cookie transport and expire handling", async () => {
  const client = await clientContext();
  await login(client);
  client.replies.push(json({ detail: "Expired" }, 401));
  await assert.rejects(client.api.downloadPlanningExcel(1, "synthetic"), (err) => err.status === 401);
  assert.equal(client.calls.at(-1).options.credentials, "include");
  assert.equal(client.calls.at(-1).options.cache, "no-store");
});

test("actual RoutePlanMap sends DOM nodes to Leaflet for untrusted markers", async () => {
  const icons = [], lineColors = [], cleanups = [], effects = [];
  let refCount = 0;
  const map = { remove() {}, whenReady() {}, fitBounds() {}, setView() {} };
  const L = { map: () => map, control: { zoom: () => ({ addTo() {} }) },
    divIcon: (options) => { icons.push(options); return options; }, marker: () => ({ addTo() {} }),
    polyline: (_, options) => { lineColors.push(options.color); return { addTo() {} }; }, latLngBounds: (x) => x };
  const context = vm.createContext({ exports: {}, document: { createElement: domElement },
    window: { addEventListener() {}, removeEventListener() {}, clearTimeout() {} },
    useRef: () => ({ current: refCount++ === 0 ? domElement() : null }), useState: () => ["", (message) => { if (message) assert.fail(message); }],
    useEffect: (effect) => effects.push(effect), loadLeaflet: async () => L, addCartoBasemapLayer() {},
    React: { createElement() {} }
  });
  vm.runInContext(await compile("../src/routeMarkers.ts"), context);
  Object.assign(context, context.exports);
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const component = app.slice(app.indexOf("function RoutePlanMap("), app.indexOf("\nfunction Home("));
  vm.runInContext(ts.transpileModule(component, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  const malicious = '\"><img src=x onerror="syntheticAttack()">';
  context.RoutePlanMap({ plan: { start_location: { latitude: 51, longitude: 4 }, return_to_start: true,
    routes: [{ color: malicious, stops: [{ sequence: malicious, latitude: 51.1, longitude: 4.1 }] }] } });
  effects.forEach((effect) => cleanups.push(effect()));
  await new Promise(setImmediate);
  const stop = icons.find(({ html }) => typeof html !== "string");
  assert.ok(stop, "Dynamic marker must be an element, never an HTML template");
  assert.equal(stop.html.textContent, malicious);
  assert.equal(stop.html.style.backgroundColor, "#2E6F95");
  assert.deepEqual(lineColors, ["#2E6F95"]);
  cleanups.forEach((cleanup) => cleanup());
});

async function passwordFormContext(updateUser) {
  const values = [];
  let cursor = 0, changed = 0, cancelled = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
    useState: (initial) => {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [values[index], (next) => { values[index] = next; }];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    }
  };
  const context = vm.createContext({ exports: {}, React, Error,
    require: (name) => name === "react" ? React : { api: { updateUser } }
  });
  vm.runInContext(await compile("../src/UserPasswordForm.tsx"), context);
  function render() {
    cursor = 0;
    return context.exports.UserPasswordForm({ user: { id: 7, email: "member@example.org" },
      onChanged: () => changed++, onCancel: () => cancelled++ });
  }
  function nodes(tree) { return [tree, ...tree.children.filter((child) => child && typeof child === "object").flatMap(nodes)]; }
  function field(name) { return nodes(render()).find((node) => node.type === "input" && node.props.name === name); }
  return { render, field, nodes, changed: () => changed, cancelled: () => cancelled };
}

test("password form blocks mismatches and submits only the confirmed password", async () => {
  const calls = [];
  let finish;
  const view = await passwordFormContext((id, payload) => {
    calls.push({ id, payload });
    return new Promise((resolve) => { finish = resolve; });
  });
  assert.equal(view.field("new-password").props.type, "password");
  assert.equal(view.field("confirm-password").props.autoComplete, "new-password");
  view.field("new-password").props.onChange({ target: { value: "Synthetic-new-password!" } });
  view.field("confirm-password").props.onChange({ target: { value: "Different-synthetic-value!" } });
  await view.render().props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 0);
  assert.ok(view.nodes(view.render()).some((node) => node.props.role === "alert"));
  view.field("confirm-password").props.onChange({ target: { value: "Synthetic-new-password!" } });
  const form = view.render();
  const pending = form.props.onSubmit({ preventDefault() {} });
  await form.props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 1, "Double submission must not change the password twice");
  assert.equal(calls[0].id, 7);
  assert.deepEqual(Object.keys(calls[0].payload), ["password"]);
  assert.equal(calls[0].payload.password, "Synthetic-new-password!");
  assert.equal(view.nodes(view.render()).find((node) => node.type === "fieldset").props.disabled, true);
  finish();
  await pending;
  assert.equal(view.changed(), 1);
  assert.equal(view.field("new-password").props.value, "");
  assert.equal(view.field("confirm-password").props.value, "");
});

test("password form surfaces server failure and cancel does not send a change", async () => {
  let calls = 0;
  const view = await passwordFormContext(async () => { calls++; throw new Error("Synthetic server failure"); });
  view.field("new-password").props.onChange({ target: { value: "Synthetic-password!" } });
  view.field("confirm-password").props.onChange({ target: { value: "Synthetic-password!" } });
  await view.render().props.onSubmit({ preventDefault() {} });
  assert.equal(calls, 1);
  assert.equal(view.changed(), 0);
  assert.ok(view.nodes(view.render()).some((node) => node.props.role === "alert"));
  assert.equal(view.nodes(view.render()).find((node) => node.type === "fieldset").props.disabled, false);
  view.nodes(view.render()).find((node) => node.type === "button" && node.props.type === "button").props.onClick();
  assert.equal(view.cancelled(), 1);
  assert.equal(calls, 1);
});
