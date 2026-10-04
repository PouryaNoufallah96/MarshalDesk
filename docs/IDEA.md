# What we're building

The idea behind MarshalDesk, as introduced in the video.

- An Intercom-style customer support app
- Businesses drop a chat widget on their website
- Their visitors chat with an AI agent or a real human

## Core feature 1: Live chat

- Embeddable widget for any website
- Real-time messaging between visitors and the business
- Dashboard where the business team sees and answers conversations

## Core feature 2: AI support agent

- Businesses upload their knowledge: PDFs, docs, markdown files
- We build a RAG pipeline (retrieval-augmented generation) on top of it
- The agent answers visitor questions using only that knowledge

## The agent has to know its limits

- Every incoming message gets classified first: is this a real support question?
- On-topic → answer from the knowledge base
- Off-topic ("what's 5 × 5?", "write me a poem") → politely decline
- Why it matters: every random question it answers is attack surface and burned tokens
- Can't answer confidently → hand off to a human

## What we're NOT building (v1)

- Email/ticketing, help center, product tours
- Mobile apps
- Billing and pricing plans

## End result

A working product: widget on a real site, AI answering from uploaded docs, humans taking over when needed.
