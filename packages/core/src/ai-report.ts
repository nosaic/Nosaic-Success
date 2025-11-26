import type { CombinedCompany } from "./combiner";

export async function generateChurnReport(
	companies: CombinedCompany[],
	openrouterApiKey: string,
): Promise<string> {
	const prompt = `You are a customer success analyst. Analyze the following customer data and generate a churn risk report.

For each company, you have:
- CRM data (revenue, deals, owner info, lifecycle stage, sentiment)
- Customer support data (tickets, priorities, CSAT, health scores)

Identify customers at risk of churning and provide actionable recommendations.

Customer Data:
${JSON.stringify(companies, null, 2)}

Generate a report in markdown format with:
1. Executive Summary
2. High-Risk Customers (sorted by risk level)
3. Medium-Risk Customers
4. Key Insights & Patterns
5. Recommended Actions

Be specific and data-driven. Focus on actionable insights.`;

	const response: Response = await fetch(
		"https://openrouter.ai/api/v1/chat/completions",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${openrouterApiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "anthropic/claude-3.5-sonnet",
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`OpenRouter API error: ${response.statusText}`);
	}

	const data = await response.json() as { choices: { message: { content: string } }[] };
	if (!data.choices?.[0]?.message?.content) {
		throw new Error("Invalid response from OpenRouter API");
	}
	return data.choices[0].message.content;
}
