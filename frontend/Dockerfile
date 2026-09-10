FROM node:20-alpine AS dev

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM node:20-alpine AS build

WORKDIR /app
ARG VITE_API_URL=/api
ARG VITE_CARTO_BASEMAP_KEY=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CARTO_BASEMAP_KEY=$VITE_CARTO_BASEMAP_KEY
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
