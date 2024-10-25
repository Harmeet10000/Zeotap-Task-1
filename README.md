### Table of Contents:
```markdown
## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Backend Installation](#backend-installation)
  - [Frontend Installation](#frontend-installation)
- [Configuration](#configuration)
  - [Backend Configuration](#backend-configuration)
  - [Frontend Configuration](#frontend-configuration)
- [Usage](#usage)
- [Security Layer](#security-layer)
- [Performance Considerations](#performance-considerations)
- [API Endpoints](#api-endpoints)
- [API Integration](#api-integration)
- [Design Choices](#design-choices)
- [License](#license)
```

---

### Updated README with Corrections:
```markdown
# AST Backend

This repository contains the backend and frontend for the AST project, implementing an API for managing and evaluating rules using Abstract Syntax Trees (AST). The backend is built using Node.js, Express, and MongoDB, with a React frontend for user interaction.

---

## Features
- Create, update, delete, and fetch rules using MongoDB.
- Evaluate rules with user-provided data.
- Combine multiple rules into a single rule.
- Secure API with rate limiting, XSS protection, and data sanitization.
- CORS enabled for frontend integration.
- Built-in middleware for error handling and request logging.

---

## Prerequisites
Ensure the following are installed on your system:
- **Node.js** (version 14.x or later)
- **MongoDB** (running locally or accessible remotely)
- **npm** (comes bundled with Node.js)

---

## Installation

### Backend Installation
1. Clone the repository and navigate to the backend directory:
   ```bash
   git clone https://github.com/Harmeet10000/Zeotap-Task-1.git
   cd Zeotap-Task-1/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update the `.env.sample` file with the following:
   ```
   MONGO_URI="mongodb://localhost:27017/rule-engine"
   PORT=8000
   ```

### Frontend Installation
1. Navigate to the frontend directory:
   ```bash
   cd Zeotap-Task-1/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The frontend will be accessible at `http://localhost:5173`.

---

## Configuration

### Backend Configuration
- **MongoDB**: Make sure MongoDB is running and accessible at the configured URI.
- **CORS**: CORS is enabled to allow requests from `http://localhost:5173`. Update the allowed origins if required.
- **Rate Limiting**: Each IP is limited to 150 requests per hour to protect against abuse.

### Frontend Configuration
The frontend communicates with the backend via API calls. The backend should be running on `http://localhost:8000`. The `proxy` configuration in `package.json` ensures that `/api` requests are forwarded to the backend.

---

## Usage
1. Ensure the backend is running on `http://localhost:8000`.
2. Start the backend server:
   ```bash
   npm start
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## Security Layer
The backend includes:
- **Helmet**: Sets security-related HTTP headers.
- **XSS-Clean**: Sanitizes user input to prevent XSS attacks.
- **Mongo-Sanitize**: Prevents NoSQL injection attacks by sanitizing input.
- **HPP (HTTP Parameter Pollution)**: Prevents HTTP parameter pollution attacks.
- **Rate Limiting**: Limits requests to prevent DDoS attacks.
- **CORS**: Configures Cross-Origin Resource Sharing.

The frontend includes:
- **Form Validation**: `zod` schemas ensure only valid data is submitted.
- **API Error Handling**: Managed through `axios` to prevent disruptions.

---

## Performance Considerations
- **Vite**: Optimized build process and fast refresh during development.
- **Form Management**: `react-hook-form` reduces unnecessary re-renders.
- **Memoization**: Prevents unnecessary recomputation.
   ```javascript
   const convertedData = useMemo(
     () => ({
       age: 0,
       salary: 0,
       experience: 0,
       department: "",
     }),
     []
   );
   ```
- **Callback Optimization**: Prevents unnecessary re-creation of functions.
   ```javascript
   const handleSelectRule = useCallback((ruleId) => {
     setSelectedRules((prevSelected) =>
       prevSelected.includes(ruleId)
         ? prevSelected.filter((id) => id !== ruleId)
         : [...prevSelected, ruleId]
     );
   }, []);
   ```

---

## API Endpoints
- **POST /api/rules**: Create a new rule.
- **GET /api/rules/:ruleName**: Get a rule by name.
- **GET /api/rules**: Get all rules.
- **PUT /api/rules/:ruleId**: Update a rule by ID.
- **DELETE /api/rules/:ruleId**: Delete a rule by ID.
- **POST /api/rules/combine**: Combine multiple rules into one.
- **POST /api/rules/evaluate/:ruleId**: Evaluate a rule with data.

---

## API Integration
Frontend API interactions:
- **Create Rule**:
   ```javascript
   RuleService.createRule("Sample Rule", "age > 18");
   ```
- **Evaluate Rule**:
   ```javascript
   RuleService.evaluateRule(ruleId, { age: 25, department: "IT" });
   ```
- **Combine Rules**:
   ```javascript
   RuleService.combineRules([ruleId1, ruleId2]);
   ```

---

## Design Choices
1. **Modular Structure**: Backend code is divided into controllers, routes, and models.
2. **AST for Rule Engine**: Efficient rule evaluation using Abstract Syntax Trees.
3. **Mongoose ODM**: Simplifies MongoDB interactions.
4. **Express Middleware**: Handles security, logging, and error management.
5. **Environment Variables**: Sensitive configurations stored in `.env` for security.
6. **Utility-First Styling**: TailwindCSS simplifies frontend styling.

---

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```

