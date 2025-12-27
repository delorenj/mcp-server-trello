//evals.ts

import { EvalConfig } from 'mcp-evals';
import { openai } from '@ai-sdk/openai';
import { grade, EvalFunction } from 'mcp-evals';

const get_cards_by_list_idEval: EvalFunction = {
  name: 'get_cards_by_list_id Tool Evaluation',
  description: 'Evaluates the get_cards_by_list_id tool functionality',
  run: async () => {
    const result = await grade(
      openai('gpt-4'),
      'Can you fetch all cards from the Trello list with ID abc123?'
    );
    return JSON.parse(result);
  },
};

const get_listsEval: EvalFunction = {
  name: 'get_lists Tool Evaluation',
  description: 'Evaluates the get_lists tool by retrieving all lists from a specified board',
  run: async () => {
    const result = await grade(
      openai('gpt-4'),
      'Please retrieve all lists from the board with ID 12345 and provide their names.'
    );
    return JSON.parse(result);
  },
};

const get_recent_activityEvalFunction: EvalFunction = {
  name: 'get_recent_activity Tool Evaluation',
  description: 'Evaluates the ability to fetch recent activity on the Trello board',
  run: async () => {
    const result = await grade(
      openai('gpt-4'),
      'Fetch the recent activity on the Trello board, limit it to 5 items'
    );
    return JSON.parse(result);
  },
};

const add_card_to_listEval: EvalFunction = {
  name: 'add_card_to_listEval',
  description: 'Evaluates the add_card_to_list tool',
  run: async () => {
    const result = await grade(
      openai('gpt-4'),
      "Please add a new card named 'Demo Card' to the list with ID 'abc123', with a description of 'This is a test card', due date '2023-12-31T12:00:00Z', start date '2025-08-05', and a label 'priority'."
    );
    return JSON.parse(result);
  },
};

const update_card_detailsEval: EvalFunction = {
  name: 'update_card_details Evaluation',
  description: 'Evaluates the update_card_details tool functionality',
  run: async () => {
    const result = await grade(
      openai('gpt-4'),
      "Please update the card with ID 'abc123' to have the name 'Updated Card Name', the description 'New description for the card', a due date of '2024-01-01T10:00:00Z', start date '2025-08-05', and labels ['priority','review']."
    );
    return JSON.parse(result);
  },
};

const mark_card_completeEval: EvalFunction = {
  name: 'mark_card_complete Evaluation',
  description: 'Evaluates the ability to mark a card as complete using dueComplete',
  run: async () => {
    const result = await grade(
      openai('gpt-4'),
      "Please mark the card with ID 'xyz789' as complete by setting dueComplete to true."
    );
    return JSON.parse(result);
  },
};

const create_card_from_templateEval: EvalFunction = {
  name: 'create_card_from_template Evaluation',
  description: 'Evaluates the ability to create a new card from a template card',
  run: async () => {
    const result = await grade(
      openai('gpt-4'),
      "Please create a new card from the template card with ID 'template123' and add it to the list with ID 'list456'. Name the new card 'My New Task'."
    );
    return JSON.parse(result);
  },
};

const config: EvalConfig = {
  model: openai('gpt-4'),
  evals: [
    get_cards_by_list_idEval,
    get_listsEval,
    get_recent_activityEvalFunction,
    add_card_to_listEval,
    update_card_detailsEval,
    mark_card_completeEval,
    create_card_from_templateEval,
  ],
};

export default config;

export const evals = [
  get_cards_by_list_idEval,
  get_listsEval,
  get_recent_activityEvalFunction,
  add_card_to_listEval,
  update_card_detailsEval,
  mark_card_completeEval,
  create_card_from_templateEval,
];
