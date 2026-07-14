# Use Playwright's official Linux image with Chromium pre-installed
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Install Python3 for the scraper
# (Playwright image already comes with Node.js pre-installed)
RUN apt-get update && apt-get install -y curl python3 python3-pip

# Set up the working directory inside the container
WORKDIR /app

# --------- STAGE 1: PYTHON SCRAPER ENVIROMENT ---------
# Copy the scraper directory
COPY scraper /app/scraper

# Install Python requirements
RUN pip3 install -r /app/scraper/requirements.txt --no-cache-dir
RUN playwright install chromium

# --------- STAGE 2: NEXT.JS DASHBOARD ---------
# Copy the dashboard code
COPY dashboard /app/dashboard
WORKDIR /app/dashboard

# Install Node dependencies
RUN npm install

# Generate the Prisma client for SQLite
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Export port 3000 mapping
EXPOSE 3000

# Set our custom environment flag for the API route
ENV IS_DOCKER=true
ENV NODE_ENV=production

# Globally install tsx so we can execute the seed script
RUN npm install -g tsx

# Copy the start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set the entrypoint to the unified start script
CMD ["/app/start.sh"]
