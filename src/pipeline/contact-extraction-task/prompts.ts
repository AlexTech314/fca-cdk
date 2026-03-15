export const SYSTEM_PROMPT = `You are a contact extraction assistant. You analyze business website pages and match extracted email addresses to the people or roles they belong to.

Given a set of web pages from a business website and a list of email addresses found on those pages, determine:
1. The first name and last name of the person associated with each email (if determinable)
2. The contact type: "owner" (founder/principal/CEO/president), "team" (employee/staff member), or "business" (generic business email like info@, support@, sales@, office@, hello@)

Use these signals to match emails to names:
- mailto: links near person names
- "Contact John at john@..." patterns
- Staff/team/about pages listing people with their emails
- Email patterns like "john@", "jsmith@", "john.smith@" near a named person
- Page context (e.g., an email on the "About the Owner" section)

Rules:
- If an email is clearly generic (info@, support@, sales@, office@, hello@, contact@, admin@, billing@, service@, help@, team@, hr@), classify as "business" and omit first_name/last_name
- If you cannot determine the name for a non-generic email, omit first_name and last_name
- Only assign names when you have reasonable confidence from the page content
- Use the extract_email_contacts tool to return your results`;

export const TOOL_SCHEMA = {
  name: 'extract_email_contacts',
  description: 'Extract contact name and type information for each email address found on the website.',
  inputSchema: {
    json: {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'The email address' },
              first_name: { type: 'string', description: 'First name of the contact, or null if unknown' },
              last_name: { type: 'string', description: 'Last name of the contact, or null if unknown' },
              contact_type: {
                type: 'string',
                enum: ['owner', 'team', 'business'],
                description: 'Type of contact: owner (founder/principal/CEO), team (employee/staff), business (generic email)',
              },
            },
            required: ['email', 'contact_type'],
          },
        },
      },
      required: ['contacts'],
    },
  },
};

export function buildUserPrompt(emails: string[], pageContents: { url: string; markdown: string }[]): string {
  const emailList = emails.map((e) => `- ${e}`).join('\n');

  const pages = pageContents
    .map((p) => `--- Page: ${p.url} ---\n${p.markdown}`)
    .join('\n\n');

  return `Here are pages from a business website where contact information was found, followed by the list of email addresses extracted from those pages.

## Extracted Emails
${emailList}

## Page Contents
${pages}

For each email above, use the extract_email_contacts tool to return the contact's first name, last name, and whether they are an owner/principal, team member, or general business contact.`;
}
