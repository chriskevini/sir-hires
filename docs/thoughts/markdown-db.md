# MarkdownDB

The constant struggle of converting between JSON and Markdown to meet poorly-defined specifications is exhausting. After many sleepless nights, I have come to the conclusion that the 1st class consumers of my data are the human user and the LLM (Laptop Language Model). The interface between them, the app, is a 3rd class citizen and should work harder to serve the needs of the elite.

Therefore, from now on, I will be storing all data relevant to the task at hand as simple, organic, GMO-free text strings.  *Gasp*. "How about data integrity," you ask? The app can lint the text field as the user edits. Actually, it can even put training wheels on the text field for new users. How helpful.

"Lint?" Yes. I will enforce a well-defined data format to keep things flowing smoothly. The goals are human-readability and ease of use. Key-value pairs are the perfect answer. With headings to introduce minimally-intrusive nesting.

The key benefits are:
 -  Streamable: I love watching LLM response streams. Who doesn't? So much better than a loading indicator.
 - Collaborative editing: Make atomic changes to the data to preserve as much KV cache as possible and reduce latency between turns.
 - High accuracy: According to Improving Agents.
 - Low token count: 10-50% savings reported. No consensus but definitely better than JSON.

Besides, by the time I add features that need SQL-like queries, a lab in China will have developed the technology to squeeze entire-app context windows into small LLMs.

Further reading:
https://www.improvingagents.com/blog/best-input-data-format-for-llms/
