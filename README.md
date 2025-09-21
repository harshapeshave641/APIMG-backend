# APIMG-backend

# API Management Backend

## Overview
This backend is designed for API management with robust logging, monitoring, and analytics. It leverages Kafka for event-driven communication, Redis for caching and rate limiting, and Docker for containerization.

## Architecture
The backend is structured into multiple services:


- **Main Server**: Handles authentication, API key management, and client interactions.
- **Kafka Producers**: Publish logs and request data to Kafka topics.
- **Kafka Consumers**:
  - **Anomaly Detector**: Monitors API failures and sends alerts.
  - **Logger**: Stores API request logs in MongoDB.
  - **Redis Updater**: Updates API usage statistics in Redis.
- **Redis**: Used for caching responses, rate limiting, and storing temporary analytics.
- **MongoDB (Cloud)**: Stores persistent data such as API logs, client details, and analytics.

## Technologies Used
- **Node.js & Express.js** - Main backend framework
- **Kafka (Confluent)** - Asynchronous event processing
- **Redis** - In-memory storage for caching and rate limiting
- **MongoDB (Cloud)** - NoSQL database for long-term data storage
- **Docker** - Containerization for running all services in isolated environments
- **Nodemailer** - Sending email alerts for API anomalies

## Setting Up Locally with Docker
Ensure you have **Docker** and **Docker Compose** installed.

### Steps:
1. Clone the repository:
   ```sh
   git clone https://github.com/harshapeshave641/APIMG-backend.git
   cd APIMG-backend
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<your_mongo_uri>
   JWT_SECRET=<your_jwt_secret>
   EMAIL_PASSWORD=<your_email_password>
   ```

3. Build and start all services using Docker Compose:
   ```sh
   docker-compose up --build
   ```

4. The backend should now be running on `http://localhost:5000`.

## Key Functionalities
- **API Key-based authentication**
- **Rate Limiting using Redis**
- **Real-time Monitoring & Logging via Kafka**
- **Automated Anomaly Detection & Email Alerts**
- **Dockerized Environment for Easy Deployment**



