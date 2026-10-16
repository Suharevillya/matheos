# Matheos web is a static site (core runs in the browser): build the workspaces, serve web/dist with nginx.
FROM node:24-alpine AS build
WORKDIR /src
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /src/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
