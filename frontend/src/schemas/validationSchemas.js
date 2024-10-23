import { z } from "zod";

// Validation schema for rule creation
export const ruleSchema = z.object({
  ruleName: z.string().min(1, "Rule name is required"),
  ruleString: z
    .string()
    .min(1, "Rule expression is required")
    .regex(
      /^[A-Za-z0-9\s()><='"|&]+$/,
      "Invalid characters in rule. Only use letters, numbers, spaces, and operators."
    ),
});

// Validation schema for evaluation data
export const evaluationSchema = z.object({
  age: z.number().min(0).max(120, "Age must be between 0 and 120"),
  department: z.string().min(1, "Department is required"),
  salary: z.number().min(0, "Salary must be non-negative"),
  experience: z.number().min(0, "Experience must be non-negative"),
});
