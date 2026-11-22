import type { ChatMessage, ContactLink } from './types'

/** Mirrors the custom_enquiry pattern in backend/app/services/chat/parsing.py, plus a bare "idea". */
const CUSTOM = new RegExp(
  '\\b(custom\\w*|customi[sz]\\w*|bespoke|commission\\w*|made for me|one[- ]off|personali[sz]\\w*|' +
  '(my|our) (own )?(idea|design|concept|sketch|drawing)s?|own (idea|design|concept)s?|i have an? (idea|design)|' +
  '(make|made|design|create|print) (it |one |something |this )?(for me|to my|from my|as per my|according to my)|' +
  'can (you|u) (make|design|create|print) (me |something|a |an |my )|' +
  '(with|put) (my|a|our|their) (name|photo|logo|text|initials) on)\\b' +
  '|^\\s*(an? |my )?(own )?ideas?\\s*[?.!]*\\s*$',
  'i',
)

export const isCustomRequest = (text: string) => CUSTOM.test(text)

/** Same links and wording as CUSTOM_LINKS / CUSTOM_REPLY in backend/app/services/chat/service.py. */
export const CUSTOM_LINKS: ContactLink[] = [
  { kind: 'customise', label: 'Customise page', url: '/customise' },
  { kind: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/simply__odd/' },
  { kind: 'whatsapp', label: 'Chat on WhatsApp', url: 'https://wa.me/918004158359?text=Hi%20Simply%20Odd%2C%20I%27d%20like%20a%20custom%20piece.' },
]

const CUSTOM_REPLY = "Yes, we'd love to make it! Share your idea with the studio on the Customise page, on Instagram or " +
  "on WhatsApp, whichever is easiest for you. We'll reply with questions, a sketch and a fixed price, and there's " +
  "nothing to pay until you approve."

/** Answered in the browser at once: custom requests never go to the assistant API. */
export const customReply = (id: string): ChatMessage => ({
  id, role: 'assistant', content: CUSTOM_REPLY, type: 'custom_enquiry', payload: { links: CUSTOM_LINKS },
})
