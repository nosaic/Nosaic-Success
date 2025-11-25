export async function sendEmail(
	content: string,
	to: string,
	apiKey: string,
): Promise<void> {
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: "Nosaic CSM <reports@nosaic.com>",
			to: [to],
			subject: "Customer Churn Risk Report",
			text: content,
		}),
	});

	if (!response.ok) {
		throw new Error(`Email send failed: ${response.statusText}`);
	}
}
