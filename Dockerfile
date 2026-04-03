# Stage 1: Python — fetch financial data
FROM python:3.12-slim AS data-fetcher

WORKDIR /app

COPY dcf-app/server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY dcf-app/server/ ./server/

RUN python server/app/main.py


# Stage 2: Node — build the React UI
FROM node:20-slim AS ui-builder

WORKDIR /app

COPY dcf-app/client/package.json ./
RUN npm install

COPY dcf-app/client/ ./

# Copy the generated financial data into the client's public directory
COPY --from=data-fetcher /app/server/data/companies-financials.json /server/data/companies-financials.json

RUN npm run build -- --base=/


# Stage 3: Serve the built UI with a lightweight static server
FROM node:20-slim AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=ui-builder /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
