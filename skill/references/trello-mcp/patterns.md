# Workflow patterns

Use these patterns to keep Trello operations predictable and verifiable.

## Find and update a card

Use this sequence when the user names a board, list, or card instead of giving
IDs.

1. Run `list_boards`.
2. Run `set_active_board` with the matching board ID.
3. Run `get_lists`.
4. Run `get_cards_by_list_id` for likely lists.
5. Run `get_card` for the target card.
6. Run the requested write tool, such as `update_card_details` or `move_card`.
7. Run `get_card` again to verify the final state.

## Create a card with checklist work

Use this sequence for task setup.

1. Run `get_lists` and identify the destination list.
2. Run `add_card_to_list`.
3. Run `create_checklist` if the card needs a new checklist.
4. Run `add_checklist_item` for each item.
5. Run `get_card` or `get_checklist_by_name` to verify the checklist.

## Work from acceptance criteria

Use the built-in acceptance criteria helper when a Trello card stores delivery
criteria in a checklist.

1. Run `get_acceptance_criteria`.
2. Map each checklist item to the requested work.
3. After implementation, run `update_checklist_item` to mark completed items
   only when the work has been verified.

## Attach generated or external assets

Use URL attachment tools when an asset is already hosted.

1. Run `get_card` to verify the target card.
2. Run `attach_image_to_card` for image URLs or `attach_file_to_card` for other
   file URLs.
3. Run `get_card` again and inspect attachments.

Use `attach_image_data_to_card` only when the image is available as base64 data.

## Comments for audit trails

Use comments for user-visible status notes.

1. Run `get_card` to verify the target.
2. Run `add_comment` with a concise note.
3. Run `get_card_comments` to confirm the comment was added.
