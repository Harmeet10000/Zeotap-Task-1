class RuleEngine {
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

    const operatorCount = { AND: 0, OR: 0 };
    const asts = rules.map((rule) => {
      const ast = this.createRule(rule);
      this.countOperators(ast, operatorCount);
      return ast;
    });

    const primaryOperator =
      operatorCount.AND >= operatorCount.OR ? "AND" : "OR";

    return asts.reduce((combined, current) => ({
      type: "operator",
      operator: primaryOperator,
      left: combined,
      right: current,
    }));
  }

  countOperators(node, counts) {
    if (!node) return;
    if (node.type === "operator") {
      counts[node.operator] = (counts[node.operator] || 0) + 1;
      this.countOperators(node.left, counts);
      this.countOperators(node.right, counts);
    }
  }

  evaluateRule(ast, data) {
    if (!ast) return true;

    const evaluateNode = (node) => {
      if (node.type === "comparison") {
        const fieldValue = data[node.field];
        const compareValue = node.value;

        if (fieldValue === undefined) {
          console.log(`Missing field in data: ${node.field}`);
          throw new Error(`Missing field: ${node.field}`);
        }

        switch (node.operator) {
          case ">":
            return fieldValue > compareValue;
          case "<":
            return fieldValue < compareValue;
          case "=":
          case "==":
            return fieldValue === compareValue;
          case ">=":
            return fieldValue >= compareValue;
          case "<=":
            return fieldValue <= compareValue;
          case "!=":
            return fieldValue !== compareValue;
          default:
            console.log(`Unknown operator: ${node.operator}`);
            throw new Error(`Unknown operator: ${node.operator}`);
        }
      }

      if (node.type === "operator") {
        const leftResult = evaluateNode(node.left);
        const rightResult = evaluateNode(node.right);
        return node.operator === "AND"
          ? leftResult && rightResult
          : leftResult || rightResult;
      }

      console.log(`Invalid node type: ${node.type}`);
      throw new Error(`Invalid node type: ${node.type}`);
    };

    try {
      return evaluateNode(ast);
    } catch (error) {
      console.log(`Rule evaluation failed: ${error.message}`);
      throw new Error(`Rule evaluation failed: ${error.message}`);
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
}

// Example usage with error handling
export function getRuleEngine() {
  const engine = new RuleEngine();

  return {
    createRule: (ruleString) => {
      try {
        engine.validateRuleString(ruleString);
        return engine.createRule(ruleString);
      } catch (error) {
        console.log(`Failed to create rule: ${error.message}`);
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
        console.log(`Failed to evaluate rule: ${error.message}`);
        throw new Error(`Failed to evaluate rule: ${error.message}`);
      }
    },
  };
}
