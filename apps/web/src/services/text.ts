/** Plain public text as the backend accepts it: no markup or control characters, at most `max` chars. */
export function safePublicText(value: string, max = 160): string {
  return Array.from(value).filter((char) => char.charCodeAt(0) >= 32 && char !== '<' && char !== '>').join('').trim().slice(0, max);
}
