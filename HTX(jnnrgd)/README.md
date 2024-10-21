# Project Setup and Execution Guide

## Prerequisites
- Node.js installed
- npm installed

## Setup Instructions

1. **Copy Environment Variables:**
    ```sh
    cp .env.dev .env
    ```

2. **Fill the Keys:**
    Open the `.env` file and fill in the required keys.

3. **Install Dependencies:**
    ```sh
    npm install
    ```

4. **Run Tests:**
    ```sh
    npm test
    ```

5. **Compile TypeScript:**
    ```sh
    npx tsc src/connectors/public-connector-main.ts
    ```

## Additional Information
- Ensure all environment variables are correctly set before running the project.
