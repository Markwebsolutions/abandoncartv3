import type { NextApiRequest, NextApiResponse } from 'next'
import { Template } from '@/lib/templatesApi'
import { fetchTemplates } from '@/lib/templatesApi'

// Utility to fill template variables
function fillTemplate(text: string, data: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, key) => data[key] || `{${key}}`)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { templateId, variables } = req.body
  if (!templateId || !variables) {
    return res.status(400).json({ error: 'Missing templateId or variables' })
  }

  // Fetch template by ID
  const templates: Template[] = await fetchTemplates()
  const template = templates.find(t => t.id === templateId)
  if (!template) {
    return res.status(404).json({ error: 'Template not found' })
  }

  // Fill variables
  const message = fillTemplate(template.text, variables)

  // Optionally, you could send the message here (WhatsApp, email, etc.)
  // For now, just return the filled message
  return res.status(200).json({ message })
}
