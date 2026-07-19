import { describe, expect, it } from 'vitest';
import { conversationReply } from '../src/shared/conversation';

const cases = [
  {
    name: 'greetings',
    phrases: [
      'hi', 'hello', 'hey', 'hey there', 'hi there', 'greetings',
      'good morning', 'good afternoon', 'good evening', 'yo', 'sup',
    ],
    response: 'Hi! Ask me anything about your indexed notes.',
  },
  {
    name: 'farewells',
    phrases: [
      'bye', 'goodbye', 'see you', 'see ya', 'take care', 'catch you later',
      'talk later', 'have a nice day',
    ],
    response: 'Goodbye! Have a great day.',
  },
  {
    name: 'thanks and follow-up thanks',
    phrases: [
      'thanks', 'thank you', 'thanks a lot', 'thank you so much', 'many thanks',
      'appreciate it', 'cheers', 'ok thanks', 'okay thanks', 'thanks buddy', 'thanks again',
    ],
    response: "You're welcome! Feel free to ask another question about your notes.",
  },
  {
    name: 'positive acknowledgements',
    phrases: [
      'ok', 'okay', 'alright', 'cool', 'awesome', 'great', 'nice', 'perfect',
      'got it', 'understood', 'sounds good',
    ],
    response: 'Got it! Feel free to ask another question about your notes.',
  },
  {
    name: 'help requests',
    phrases: ['help', 'what can you do', 'how can you help', 'who are you', 'what are you'],
    response: "I can answer questions about your indexed notes, show supporting citations, and let you know when the information isn't available.",
  },
];

describe('conversationReply', () => {
  it.each(cases)('recognizes every supported $name phrase', ({ phrases, response }) => {
    for (const phrase of phrases) expect(conversationReply(phrase)).toBe(response);
  });

  it('ignores case, surrounding whitespace, and punctuation', () => {
    expect(conversationReply('  \nHeY,\tThErE!!!  ')).toBe('Hi! Ask me anything about your indexed notes.');
    expect(conversationReply('  WHAT can YOU do??? ')).toBe(
      "I can answer questions about your indexed notes, show supporting citations, and let you know when the information isn't available.",
    );
  });

  it('does not intercept a note-related question containing conversational words', () => {
    expect(conversationReply('Okay, what did we decide about caching?')).toBeNull();
  });
});
