# ---- build stage ----
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_GATEWAY_API_URL

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GATEWAY_API_URL=${VITE_GATEWAY_API_URL}

RUN npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080