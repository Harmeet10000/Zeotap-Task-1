class RuleEngine {
  constructor() {
    this.functionRegistry = {}; // Store user-defined functions
  }

  // Register a new user-defined function
  registerFunction(name, fn) {
    if (typeof fn !== "function") {
      throw new Error(
        `Invalid function for ${name}. Must be a valid function.`
      );
    }
    this.functionRegistry[name] = fn;
  }

  // Execute a function from the registry
  executeFunction(name, args) {
    const fn = this.functionRegistry[name];
    if (!fn) {
      throw new Error(`Function ${name} not registered.`);
    }
    return fn(...args);
  }

  // Helper function to tokenize the rule string
  tokenizeRule(ruleString) {
    // First, ensure we have spaces around logical operators
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

      // Split on comparison operators
      const matches = token.match(/([^<>=!]+)([<>=!]+)(.+)/);
      if (matches) {
        processedTokens.push(matches[1].trim());
        processedTokens.push(matches[2].trim());
        processedTokens.push(matches[3].trim());
      } else {
        processedTokens.push(token);
      }
    }

    return processedTokens;
  }

  // Create AST from rule string
  createRule(ruleString) {
    const tokens = this.tokenizeRule(ruleString);
    let position = 0;

    const parseComparison = () => {
      const field = tokens[position++].replace(/['"]/g, "");
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
      let left;

      // Parse the initial expression
      if (tokens[position] === "(") {
        position++; // Skip opening parenthesis
        left = parseExpression();
        if (position < tokens.length && tokens[position] === ")") {
          position++; // Skip closing parenthesis
        }
      } else {
        left = parseComparison();
      }

      // Look for additional logical operators
      while (
        position < tokens.length &&
        ["AND", "OR"].includes(tokens[position])
      ) {
        const operator = tokens[position++];
        let right;

        // Parse the right side
        if (tokens[position] === "(") {
          position++; // Skip opening parenthesis
          right = parseExpression();
          if (position < tokens.length && tokens[position] === ")") {
            position++; // Skip closing parenthesis
          }
        } else {
          right = parseComparison();
        }

        // Create new operator node
        left = {
          type: "operator",
          operator,
          left,
          right,
        };
      }

      return left;
    };

    try {
      const ast = parseExpression();
      return ast;
    } catch (error) {
      throw new Error(`Failed to create rule: ${error.message}`);
    }
  }

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

  combineRules(rules) {
    if (!rules.length) return null;
    if (rules.length === 1) return this.createRule(rules[0]);

    // First, parse all rules into ASTs
    const asts = rules.map((rule) => this.createRule(rule));

    // Analyze the structure of each AST
    const ruleAnalysis = asts.map((ast) => this.analyzeAst(ast));

    // Group similar rules together
    const groups = this.groupSimilarRules(ruleAnalysis, asts);

    // Combine groups optimally
    return this.combineGroups(groups);
  }

  analyzeAst(ast) {
    const analysis = {
      depth: 0,
      operatorCounts: { AND: 0, OR: 0 },
      fields: new Set(),
      complexity: 0,
    };

    const traverse = (node, depth = 0) => {
      if (!node) return;

      analysis.depth = Math.max(analysis.depth, depth);

      if (node.type === "operator") {
        analysis.operatorCounts[node.operator]++;
        analysis.complexity += 1;
        traverse(node.left, depth + 1);
        traverse(node.right, depth + 1);
      } else if (node.type === "comparison") {
        analysis.fields.add(node.field);
        analysis.complexity += 0.5;
      }
    };

    traverse(ast);
    return analysis;
  }

  groupSimilarRules(analyses, asts) {
    const groups = [];
    const used = new Set();

    // Group rules that share common fields
    for (let i = 0; i < analyses.length; i++) {
      if (used.has(i)) continue;

      const group = {
        rules: [asts[i]],
        fields: analyses[i].fields,
        dominantOperator: this.getDominantOperator(analyses[i].operatorCounts),
      };

      // Find similar rules
      for (let j = i + 1; j < analyses.length; j++) {
        if (used.has(j)) continue;

        const similarity = this.calculateSimilarity(analyses[i], analyses[j]);
        if (similarity > 0.7) {
          // Threshold for similarity
          group.rules.push(asts[j]);
          used.add(j);
        }
      }

      groups.push(group);
      used.add(i);
    }

    return groups;
  }

  calculateSimilarity(analysis1, analysis2) {
    // Calculate Jaccard similarity for fields
    const intersection = new Set(
      [...analysis1.fields].filter((x) => analysis2.fields.has(x))
    );
    const union = new Set([...analysis1.fields, ...analysis2.fields]);
    const fieldSimilarity = intersection.size / union.size;

    // Calculate operator similarity
    const opSimilarity =
      this.getDominantOperator(analysis1.operatorCounts) ===
      this.getDominantOperator(analysis2.operatorCounts)
        ? 1
        : 0;

    return fieldSimilarity * 0.7 + opSimilarity * 0.3;
  }

  getDominantOperator(counts) {
    return counts.AND >= counts.OR ? "AND" : "OR";
  }

  combineGroups(groups) {
    if (groups.length === 1) {
      return this.combineGroupRules(groups[0]);
    }

    // Sort groups by complexity and dominant operator
    groups.sort((a, b) => {
      const totalComplexityA = a.rules.reduce(
        (sum, rule) => sum + this.analyzeAst(rule).complexity,
        0
      );
      const totalComplexityB = b.rules.reduce(
        (sum, rule) => sum + this.analyzeAst(rule).complexity,
        0
      );
      return totalComplexityB - totalComplexityA;
    });

    // Combine groups using OR if they have different fields, AND if they share fields
    return groups.reduce((combined, group) => {
      const groupAst = this.combineGroupRules(group);
      if (!combined) return groupAst;

      const operator = this.shouldUseAnd(combined, groupAst) ? "AND" : "OR";
      return {
        type: "operator",
        operator,
        left: combined,
        right: groupAst,
      };
    }, null);
  }

  combineGroupRules(group) {
    return group.rules.reduce((combined, current) => ({
      type: "operator",
      operator: group.dominantOperator,
      left: combined,
      right: current,
    }));
  }

  shouldUseAnd(ast1, ast2) {
    const fields1 = new Set();
    const fields2 = new Set();

    const collectFields = (ast, fields) => {
      if (!ast) return;
      if (ast.type === "comparison") {
        fields.add(ast.field);
      } else if (ast.type === "operator") {
        collectFields(ast.left, fields);
        collectFields(ast.right, fields);
      }
    };

    collectFields(ast1, fields1);
    collectFields(ast2, fields2);

    // Calculate field overlap
    const intersection = new Set([...fields1].filter((x) => fields2.has(x)));
    return intersection.size > 0;
  }

  evaluateRule(ast, data) {
    if (!ast) return true;

    const evaluateNode = (node) => {
      if (node.type === "comparison") {
        const fieldValue = data[node.field];
        const compareValue = node.value;

        // Enhanced type checking
        if (fieldValue === undefined || fieldValue === null) {
          throw new Error(`Missing or null field: ${node.field}`);
        }

        // Type coercion for numeric comparisons
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
        // Short-circuit evaluation for AND/OR
        if (node.operator === "AND") {
          const leftResult = evaluateNode(node.left);
          if (!leftResult) return false; // Short-circuit AND
          return evaluateNode(node.right);
        } else if (node.operator === "OR") {
          const leftResult = evaluateNode(node.left);
          if (leftResult) return true; // Short-circuit OR
          return evaluateNode(node.right);
        }
      }

      throw new Error(`Invalid node type: ${node.type}`);
    };

    try {
      const result = evaluateNode(ast);
      return Boolean(result); // Ensure boolean return type
    } catch (error) {
      console.error(`Rule evaluation failed: ${error.message}`);
      throw new Error(`Rule evaluation failed: ${error.message}`);
    }
  }
}



//   validateRuleString(ruleString) {
//     if (!ruleString) {
//       console.log("Rule string is empty");
//       throw new Error("Rule string cannot be empty");
//     }

//     let parenthesesCount = 0;
//     for (const char of ruleString) {
//       if (char === "(") parenthesesCount++;
//       if (char === ")") parenthesesCount--;
//       if (parenthesesCount < 0) {
//         console.log("Unbalanced parentheses detected");
//         throw new Error("Unbalanced parentheses");
//       }
//     }
//     if (parenthesesCount !== 0) {
//       console.log("Unbalanced parentheses at the end");
//       throw new Error("Unbalanced parentheses");
//     }

//     // const validSequence =
//     //   /^(\s*[\w']+\s*(>|<|=|!=|>=|<=)\s*['\w\d\s]+\s*(AND|OR)?\s*)*$/;
//     // if (!validSequence.test(ruleString)) {
//     //   console.log(`Invalid rule sequence: ${ruleString}`);
//     //   throw new Error("Invalid rule sequence");
//     // }

//     const validOperators = ["AND", "OR", ">", "<", "=", ">=", "<=", "!="];
//     const tokens = this.tokenizeRule(ruleString);

//     for (let i = 0; i < tokens.length; i++) {
//       const token = tokens[i];
//       if (validOperators.includes(token)) {
//         if (i === 0 || i === tokens.length - 1) {
//           console.log(`Operator ${token} cannot be at the start or end`);
//           throw new Error(
//             `Operator ${token} cannot be at the start or end of rule`
//           );
//         }
//       }
//     }

//     return true;
//   }
// }

// Example usage with error handling
export function getRuleEngine() {
  const engine = new RuleEngine();

  return {
    createRule: (ruleString) => {
      try {
        return engine.createRule(ruleString);
      } catch (error) {
        console.error(`Failed to create rule: ${error.message}`);
        throw new Error(`Failed to create rule: ${error.message}`);
      }
    },

    combineRules: (rules) => {
      try {
        return engine.combineRules(rules);
      } catch (error) {
        console.log(`Failed to combine rules: ${error.message}`);
        throw new Error(`Failed to combine rules: ${error.message}`);
      }
    },

    evaluateRule: (ast, data) => {
      try {
        return engine.evaluateRule(ast, data);
      } catch (error) {
        console.error(`Failed to evaluate rule: ${error.message}`);
        throw new Error(`Failed to evaluate rule: ${error.message}`);
      }
    },

    registerFunction: (name, fn) => {
      try {
        engine.registerFunction(name, fn);
      } catch (error) {
        console.error(`Failed to register function: ${error.message}`);
        throw new Error(`Failed to register function: ${error.message}`);
      }
    },
  };
}
