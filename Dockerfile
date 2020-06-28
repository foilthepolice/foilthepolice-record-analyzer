FROM node:12.13.1
WORKDIR /usr/src/api

RUN apt-get update -y && apt-get install -y imagemagick ghostscript poppler-utils

COPY package.json package-lock.json ./
RUN npm install

# Copy
COPY . .

# Start
EXPOSE 3000
CMD ["npm", "run", "dev"]
