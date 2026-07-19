type ReplyGroup = {
  phrases: readonly string[];
  response: string;
};

const replyGroups: ReplyGroup[] = [
  {
    phrases: [
      'hi', 'hello', 'hey', 'hey there', 'hi there', 'greetings',
      'good morning', 'good afternoon', 'good evening', 'yo', 'sup',
    ],
    response: 'Hi! Ask me anything about your indexed notes.',
  },
  {
    phrases: [
      'bye', 'goodbye', 'see you', 'see ya', 'take care', 'catch you later',
      'talk later', 'have a nice day',
    ],
    response: 'Goodbye! Have a great day.',
  },
  {
    phrases: [
      'thanks', 'thank you', 'thanks a lot', 'thank you so much', 'many thanks',
      'appreciate it', 'cheers', 'ok thanks', 'okay thanks', 'thanks buddy', 'thanks again',
    ],
    response: "You're welcome! Feel free to ask another question about your notes.",
  },
  {
    phrases: [
      'ok', 'okay', 'alright', 'cool', 'awesome', 'great', 'nice', 'perfect',
      'got it', 'understood', 'sounds good',
    ],
    response: 'Got it! Feel free to ask another question about your notes.',
  },
  {
    phrases: ['help', 'what can you do', 'how can you help', 'who are you', 'what are you'],
    response: "I can answer questions about your indexed notes, show supporting citations, and let you know when the information isn't available.",
  },
];

const replyByPhrase = new Map(
  replyGroups.flatMap(({ phrases, response }) => phrases.map((phrase) => [phrase, response] as const)),
);

function normalizeMessage(message: string): string {
  return message
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function conversationReply(question: string): string | null {
  return replyByPhrase.get(normalizeMessage(question)) ?? null;
}
