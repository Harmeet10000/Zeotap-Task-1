class RuleEngine {
  constructor(options = {}) {
    this.functionRegistry = new Map(); // Using Map for better performance
    this.maxRuleDepth = options.maxRuleDepth || 10;
    this.maxRuleLength = options.maxRuleLength || 1000;
    this.maxExecutionTime = options.maxExecutionTime || 1000; // ms
    this.cache = new Map(); // Cache for parsed rules
    this.cacheSize = options.cacheSize || 100;

    // Optional whitelist of allowed fields
    this.allowedFields = new Set(options.allowedFields || []);
  }

  // Maintain original function registration with added security
  registerFunction(name, fn) {
    if (typeof fn !== "function") {
      throw new Error(
        `Invalid function for ${name}. Must be a valid function.`
      );
    }

    // Wrap function with security timeout
    const securedFn = (...args) => {
      const startTime = Date.now();
      const result = fn(...this.sanitizeArgs(args));

      if (Date.now() - startTime > this.maxExecutionTime) {
        throw new Error(`Function execution timeout: ${name}`);
      }

      return result;
    };

    this.functionRegistry.set(name, securedFn);
  }

  sanitizeArgs(args) {
    return args.map((arg) => {
      if (typeof arg === "string") {
        return arg.replace(/[<>]/g, ""); // Basic XSS prevention
      }
      if (typeof arg === "number") {
        return isFinite(arg) ? arg : 0;
      }
      return arg;
    });
  }

  // Original tokenizer with added security and caching
  tokenizeRule(ruleString) {
    if (!ruleString || typeof ruleString !== "string") {
      throw new Error("Rule string cannot be empty");
    }

    if (ruleString.length > this.maxRuleLength) {
      throw new Error(
        `Rule string exceeds maximum length of ${this.maxRuleLength}`
      );
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/i,
      /function\s*\(/i,
      /setTimeout\s*\(/i,
    ];
    if (dangerousPatterns.some((pattern) => pattern.test(ruleString))) {
      throw new Error("Potentially dangerous code pattern detected");
    }

    // Check cache first
    const cacheKey = ruleString;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Original tokenization logic
    let normalized = ruleString
      .replace(/AND/g, " AND ")
      .replace(/OR/g, " OR ")
      .replace(/\s+/g, " ")
      .trim();

    const tokens = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];

      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
        current += char;
      } else if (!inQuotes && ["(", ")"].includes(char)) {
        if (current.trim()) tokens.push(current.trim());
        tokens.push(char);
        current = "";
      } else if (!inQuotes && char === " ") {
        if (current.trim()) tokens.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) tokens.push(current.trim());

    // Process comparison operators
    const processedTokens = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (["(", ")", "AND", "OR"].includes(token)) {
        processedTokens.push(token);
        continue;
      }

      const matches = token.match(/([^<>=!]+)([<>=!]+)(.+)/);
      if (matches) {
        processedTokens.push(matches[1].trim());
        processedTokens.push(matches[2].trim());
        processedTokens.push(matches[3].trim());
      } else {
        processedTokens.push(token);
      }
    }

    // Cache the result
    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, processedTokens);

    return processedTokens;
  }

  // Enhanced createRule with depth tracking but maintaining original AST structure
  createRule(ruleString) {
    this.validateRuleString(ruleString);
    const tokens = this.tokenizeRule(ruleString);
    let position = 0;
    let depth = 0;

    const parseComparison = () => {
      const field = tokens[position++].replace(/['"]/g, "");

      // Field validation
      if (this.allowedFields.size > 0 && !this.allowedFields.has(field)) {
        throw new Error(`Unauthorized field access: ${field}`);
      }

      const operator = tokens[position++];
      const value = tokens[position++].replace(/['"]/g, "");

      if (!["=", ">", "<", ">=", "<=", "!="].includes(operator)) {
        throw new Error(`Invalid comparison operator: ${operator}`);
      }

      return {
        type: "comparison",
        field,
        operator,
        value: isNaN(value) ? value : Number(value),
      };
    };

    const parseExpression = () => {
      depth++;
      if (depth > this.maxRuleDepth) {
        throw new Error(`Maximum rule depth of ${this.maxRuleDepth} exceeded`);
      }

      let left;

      if (tokens[position] === "(") {
        position++;
        left = parseExpression();
        if (tokens[position] === ")") {
          position++;
        }
      } else {
        left = parseComparison();
      }

      while (
        position < tokens.length &&
        ["AND", "OR"].includes(tokens[position])
      ) {
        const operator = tokens[position++];
        let right;

        if (tokens[position] === "(") {
          position++;
          right = parseExpression();
          if (tokens[position] === ")") {
            position++;
          }
        } else {
          right = parseComparison();
        }

        left = {
          type: "operator",
          operator,
          left,
          right,
        };
      }

      depth--;
      return left;
    };

    try {
      const ast = parseExpression();
      return ast;
    } catch (error) {
      throw new Error(`Failed to create rule: ${error.message}`);
    }
  }

  // Enhanced evaluateRule with timeout and security checks
  evaluateRule(ast, data) {
    if (!ast || !data) {
      throw new Error("Invalid AST or data object");
    }

    const startTime = Date.now();
    const evaluateNode = (node) => {
      if (Date.now() - startTime > this.maxExecutionTime) {
        throw new Error("Rule evaluation timeout");
      }

      if (!node) return true;

      if (node.type === "comparison") {
        const fieldValue = this.safeDataAccess(data, node.field);
        const compareValue = node.value;

        if (fieldValue === undefined || fieldValue === null) {
          throw new Error(`Missing or null field: ${node.field}`);
        }

        const normalizedFieldValue =
          typeof compareValue === "number" ? Number(fieldValue) : fieldValue;

        if (typeof compareValue === "number" && isNaN(normalizedFieldValue)) {
          throw new Error(`Invalid numeric value for field: ${node.field}`);
        }

        switch (node.operator) {
          case ">":
            return normalizedFieldValue > compareValue;
          case "<":
            return normalizedFieldValue < compareValue;
          case "=":
          case "==":
            return normalizedFieldValue === compareValue;
          case ">=":
            return normalizedFieldValue >= compareValue;
          case "<=":
            return normalizedFieldValue <= compareValue;
          case "!=":
            return normalizedFieldValue !== compareValue;
          default:
            throw new Error(`Unknown operator: ${node.operator}`);
        }
      }

      if (node.type === "operator") {
        if (node.operator === "AND") {
          const leftResult = evaluateNode(node.left);
          if (!leftResult) return false;
          return evaluateNode(node.right);
        } else if (node.operator === "OR") {
          const leftResult = evaluateNode(node.left);
          if (leftResult) return true;
          return evaluateNode(node.right);
        }
      }

      throw new Error(`Invalid node type: ${node.type}`);
    };

    try {
      const result = evaluateNode(ast);
      return Boolean(result);
    } catch (error) {
      throw new Error(`Rule evaluation failed: ${error.message}`);
    }
  }

  // Safe data access method
  safeDataAccess(data, field) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data object");
    }

    if (!field || typeof field !== "string") {
      throw new Error("Invalid field name");
    }

    // Prevent prototype pollution
    if (
      field === "__proto__" ||
      field === "constructor" ||
      field === "prototype"
    ) {
      throw new Error("Access to protected fields is not allowed");
    }

    return data[field];
  }

  // Original rule string validation
  validateRuleString(ruleString) {
    if (!ruleString) {
      throw new Error("Rule string cannot be empty");
    }

    let parenthesesCount = 0;
    for (const char of ruleString) {
      if (char === "(") parenthesesCount++;
      if (char === ")") parenthesesCount--;
      if (parenthesesCount < 0) {
        throw new Error("Unbalanced parentheses");
      }
    }
    if (parenthesesCount !== 0) {
      throw new Error("Unbalanced parentheses");
    }

    return true;
  }

  // Updated combineRules function with heuristic optimization and simplification
  // Enhanced combineRules implementation
  combineRules(rules) {
    if (!rules.length) return null;
    if (rules.length === 1) return this.createRule(rules[0]);

    // Parse all rules into ASTs
    const asts = rules.map((rule) => this.createRule(rule));

    // Group conditions by field
    const fieldGroups = new Map();
    asts.forEach((ast) => this.extractConditions(ast, fieldGroups));

    // Optimize each field group
    const optimizedGroups = new Map();
    for (const [field, conditions] of fieldGroups) {
      const optimizedCondition = this.optimizeConditions(field, conditions);
      if (optimizedCondition) {
        optimizedGroups.set(field, optimizedCondition);
      }
    }

    // Rebuild the optimized AST
    return this.rebuildAst(optimizedGroups);
  }

  extractConditions(ast, fieldGroups) {
    const traverse = (node) => {
      if (!node) return;

      if (node.type === "comparison") {
        if (!fieldGroups.has(node.field)) {
          fieldGroups.set(node.field, []);
        }
        fieldGroups.get(node.field).push(node);
      } else if (node.type === "operator") {
        traverse(node.left);
        traverse(node.right);
      }
    };

    traverse(ast);
  }

  optimizeConditions(field, conditions) {
    // Group conditions by operator
    const operatorGroups = {
      ">": [],
      "<": [],
      "=": [],
      ">=": [],
      "<=": [],
      "!=": [],
    };

    conditions.forEach((condition) => {
      operatorGroups[condition.operator].push(condition.value);
    });

    const optimizedConditions = [];

    // Optimize numeric comparisons
    if (operatorGroups[">"].length > 0) {
      optimizedConditions.push({
        type: "comparison",
        field,
        operator: ">",
        value: Math.min(...operatorGroups[">"].map((v) => Number(v))),
      });
    }

    if (operatorGroups["<"].length > 0) {
      optimizedConditions.push({
        type: "comparison",
        field,
        operator: "<",
        value: Math.max(...operatorGroups["<"].map((v) => Number(v))),
      });
    }

    // Handle equality conditions
    if (operatorGroups["="].length > 0) {
      const uniqueValues = [...new Set(operatorGroups["="])];
      uniqueValues.forEach((value) => {
        optimizedConditions.push({
          type: "comparison",
          field,
          operator: "=",
          value,
        });
      });
    }

    // Combine conditions with appropriate operators
    return this.combineConditions(optimizedConditions);
  }

  combineConditions(conditions) {
    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];

    // For the same field, default to OR for equality checks and AND for ranges
    const hasRangeConditions = conditions.some((c) =>
      [">", "<", ">=", "<="].includes(c.operator)
    );
    const operator = hasRangeConditions ? "AND" : "OR";

    return conditions.reduce((acc, curr) => ({
      type: "operator",
      operator,
      left: acc,
      right: curr,
    }));
  }

  rebuildAst(optimizedGroups) {
    const conditions = Array.from(optimizedGroups.values()).filter(Boolean);

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];

    // Combine all field conditions with AND
    return conditions.reduce((acc, curr) => ({
      type: "operator",
      operator: "AND",
      left: acc,
      right: curr,
    }));
  }

  // Performance monitoring
  getPerformanceMetrics() {
    return {
      cacheSize: this.cache.size,
      functionCount: this.functionRegistry.size,
      maxRuleDepth: this.maxRuleDepth,
      maxRuleLength: this.maxRuleLength,
      maxExecutionTime: this.maxExecutionTime,
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

// Factory function with default configuration
export function getRuleEngine(options = {}) {
  const defaultOptions = {
    maxRuleDepth: 10,
    maxRuleLength: 1000,
    maxExecutionTime: 1000,
    cacheSize: 100,
    allowedFields: [], // Empty array means all fields are allowed
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    const engine = new RuleEngine(finalOptions);

    return {
      createRule: (ruleString) => {
        try {
          return engine.createRule(ruleString);
        } catch (error) {
          console.error(`Failed to create rule: ${error.message}`);
          throw error;
        }
      },

      combineRules: (rules) => {
        try {
          return engine.combineRules(rules);
        } catch (error) {
          console.error(`Failed to combine rules: ${error.message}`);
          throw error;
        }
      },

      evaluateRule: (ast, data) => {
        try {
          return engine.evaluateRule(ast, data);
        } catch (error) {
          console.error(`Failed to evaluate rule: ${error.message}`);
          throw error;
        }
      },

      registerFunction: (name, fn) => {
        try {
          engine.registerFunction(name, fn);
        } catch (error) {
          console.error(`Failed to register function: ${error.message}`);
          throw error;
        }
      },

      getPerformanceMetrics: () => {
        return engine.getPerformanceMetrics();
      },

      clearCache: () => {
        engine.clearCache();
      },
    };
  } catch (error) {
    console.error(`Failed to create rule engine: ${error.message}`);
    throw error;
  }
}