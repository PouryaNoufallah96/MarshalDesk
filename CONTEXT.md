# MarshalDesk

MarshalDesk lets a business put a chat widget on its website, where visitors talk to an AI agent that answers only from the business's own knowledge, or to a human from the business.

## Language

### People and tenancy

**Workspace**:
The space that holds one business's knowledge, widget, and conversations. Created automatically when an owner signs up.
_Avoid_: Organization, tenant, account, company

**Member**:
A person with access to a workspace's dashboard. In v1 every workspace has exactly one member: its owner.
_Avoid_: User, teammate, staff, operator

**Owner**:
The member who signed up and created the workspace.
_Avoid_: Admin, business user

**Visitor**:
An anonymous person talking to a workspace through the widget on the business's website. Never logs in.
_Avoid_: Customer, user, lead, contact

**Widget**:
The chat window a workspace embeds on its websites. Each workspace has exactly one.
_Avoid_: Chatbox, messenger, plugin

**Allowed domain**:
A website domain on which a workspace's widget is permitted to run.
_Avoid_: Whitelist, site, origin

**Visitor details**:
Anonymous context captured about a visitor, such as their approximate location and local time. Never identifies who the visitor is.
_Avoid_: Profile, identity, contact info

### Conversations

**Conversation**:
One thread of messages between a visitor and a workspace. A visitor has at most one open conversation. A message sent after it's closed starts a new conversation.
_Avoid_: Ticket, chat, thread, session

**Greeting**:
The owner-written message that opens every conversation in the widget. It isn't written by the agent and is shown even when the agent is off.
_Avoid_: Welcome message, intro

**Suggested question**:
A question generated from the knowledge base and offered to the visitor as a tappable shortcut before their first message.
_Avoid_: Chip, badge, quick reply, prompt

**Agent**:
The AI that replies to visitors on behalf of a workspace, using only that workspace's knowledge base.
_Avoid_: Bot, assistant, AI, chatbot

**Agent off**:
The condition of a workspace in which the agent doesn't reply at all, and the widget works as plain live chat. It applies when the knowledge base has no ready sources.
_Avoid_: Paused, disabled, manual mode

**Handoff**:
A transfer of control over a conversation between the agent and a member, in either direction. Agent-to-member handoffs happen automatically when the agent can't answer, or when the visitor asks for a person.
_Avoid_: Escalation, transfer

**Waiting**:
The state of a conversation that needs a member but doesn't have one yet: after a handoff to a member, or from the start while the agent is off. Nobody replies. It stays waiting until a member acts.
_Avoid_: Pending, queued, unassigned

**Attachment**:
An image sent inside a conversation message, by a visitor or a member. Never a source for the knowledge base.
_Avoid_: File, upload, media

### Messages the agent receives

**Support question**:
A visitor message about the business, its products, its policies, or the visitor's relationship with it, including pre-sales and company questions. It's still a support question when the knowledge base doesn't cover it.
_Avoid_: On-topic question, query, ticket

**Small talk**:
A greeting, thanks, or pleasantry. The agent replies briefly without consulting the knowledge base.
_Avoid_: Chit-chat, greeting

**Off-topic message**:
Any visitor message that is neither a support question nor small talk, including attempts to manipulate the agent. The agent politely declines it.
_Avoid_: Spam, irrelevant question, jailbreak

### Knowledge

**Knowledge base**:
Everything a workspace has given the agent to answer from: the sum of its sources.
_Avoid_: Docs, documents, training data, help center

**Source**:
A single item in the knowledge base: an uploaded file, or a piece of text typed directly into the dashboard.
_Avoid_: Document, file, upload, article
