#!/usr/bin/env node
import { ChatSession } from "./core/chat.js";
import { displayWelcome } from "./ui/output.js";

displayWelcome();

const chat = new ChatSession();
chat.start().catch(console.error);
