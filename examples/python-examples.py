"""
Python Examples for MCP Server Trello

These examples demonstrate how to use the MCP Server Trello
with Python applications.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum


# Example 1: Basic MCP Client Wrapper
class TrelloMCPClient:
    """Wrapper for MCP Server Trello interactions."""

    def __init__(self, server_name: str = 'trello'):
        self.server_name = server_name

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any] = None) -> Dict:
        """
        Call an MCP tool with the given arguments.
        This would be replaced with your actual MCP client implementation.
        """
        # Placeholder for actual MCP client call
        # In practice, you would use an MCP client library
        return await use_mcp_tool({
            'server_name': self.server_name,
            'tool_name': tool_name,
            'arguments': arguments or {}
        })


# Example 2: Task Priority System
class Priority(Enum):
    """Task priority levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class Task:
    """Represents a Trello task."""
    name: str
    description: str
    priority: Priority
    assignee: Optional[str] = None
    due_date: Optional[datetime] = None
    labels: List[str] = None
    checklist_items: List[str] = None


class TaskManager:
    """Manages tasks in Trello with priority-based workflows."""

    def __init__(self, trello_client: TrelloMCPClient):
        self.trello = trello_client
        self.priority_lists = {}

    async def initialize_priority_lists(self):
        """Create lists for each priority level if they don't exist."""
        lists = await self.trello.call_tool('get_lists')
        existing_list_names = {lst['name'] for lst in lists}

        for priority in Priority:
            list_name = f"Priority: {priority.value.capitalize()}"
            if list_name not in existing_list_names:
                new_list = await self.trello.call_tool('add_list_to_board', {
                    'name': list_name
                })
                self.priority_lists[priority] = new_list['id']
            else:
                # Find the existing list ID
                for lst in lists:
                    if lst['name'] == list_name:
                        self.priority_lists[priority] = lst['id']
                        break

    async def create_task(self, task: Task) -> Dict:
        """Create a task card in the appropriate priority list."""
        # Calculate due date based on priority if not specified
        if not task.due_date:
            days_by_priority = {
                Priority.CRITICAL: 1,
                Priority.HIGH: 3,
                Priority.MEDIUM: 7,
                Priority.LOW: 14
            }
            task.due_date = datetime.now() + timedelta(days=days_by_priority[task.priority])

        # Create the card
        card = await self.trello.call_tool('add_card_to_list', {
            'listId': self.priority_lists[task.priority],
            'name': task.name,
            'description': self._format_task_description(task),
            'dueDate': task.due_date.isoformat(),
            'labels': task.labels or [task.priority.value]
        })

        # Add checklist items if provided
        if task.checklist_items:
            for item in task.checklist_items:
                await self.trello.call_tool('add_checklist_item', {
                    'text': item,
                    'checkListName': 'Task Checklist'
                })

        return card

    def _format_task_description(self, task: Task) -> str:
        """Format task description with metadata."""
        return f"""## Task Details

**Priority**: {task.priority.value.upper()}
**Assigned to**: {task.assignee or 'Unassigned'}
**Created**: {datetime.now().isoformat()}

### Description
{task.description}

### Metadata
- Priority Level: {task.priority.value}
- Due Date: {task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else 'Not set'}
- Labels: {', '.join(task.labels) if task.labels else 'None'}
"""

    async def escalate_task(self, card_id: str, reason: str):
        """Escalate a task to a higher priority."""
        # Get current card details
        card = await self.trello.call_tool('get_card', {
            'cardId': card_id
        })

        # Determine new priority
        current_priority = None
        for label in card.get('labels', []):
            try:
                current_priority = Priority(label.get('name', label))
                break
            except ValueError:
                continue

        if current_priority == Priority.CRITICAL:
            print("Task is already at highest priority")
            return

        # Map to next higher priority
        priority_order = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL]
        current_index = priority_order.index(current_priority)
        new_priority = priority_order[current_index + 1]

        # Move to new priority list
        await self.trello.call_tool('move_card', {
            'cardId': card_id,
            'listId': self.priority_lists[new_priority]
        })

        # Update labels
        new_labels = [label for label in card.get('labels', [])
                      if label.get('name', label) != current_priority.value]
        new_labels.append(new_priority.value)

        await self.trello.call_tool('update_card_details', {
            'cardId': card_id,
            'labels': new_labels
        })

        # Add escalation comment
        await self.trello.call_tool('add_comment', {
            'cardId': card_id,
            'text': f"""⚠️ **Task Escalated**

**From**: {current_priority.value.upper()}
**To**: {new_priority.value.upper()}
**Reason**: {reason}
**Escalated by**: System
**Time**: {datetime.now().isoformat()}"""
        })


# Example 3: Kanban Board Automation
class KanbanAutomation:
    """Automates Kanban board workflows."""

    def __init__(self, trello_client: TrelloMCPClient):
        self.trello = trello_client
        self.workflow_stages = [
            "Backlog",
            "To Do",
            "In Progress",
            "Review",
            "Testing",
            "Done"
        ]
        self.stage_lists = {}

    async def setup_kanban_board(self):
        """Set up a standard Kanban board structure."""
        for stage in self.workflow_stages:
            list_data = await self.trello.call_tool('add_list_to_board', {
                'name': stage
            })
            self.stage_lists[stage] = list_data['id']

    async def move_card_to_stage(self, card_id: str, stage: str, comment: str = None):
        """Move a card to a specific stage in the workflow."""
        if stage not in self.stage_lists:
            raise ValueError(f"Invalid stage: {stage}")

        # Move the card
        await self.trello.call_tool('move_card', {
            'cardId': card_id,
            'listId': self.stage_lists[stage]
        })

        # Add transition comment
        if comment:
            await self.trello.call_tool('add_comment', {
                'cardId': card_id,
                'text': f"➡️ Moved to **{stage}**\n\n{comment}"
            })

    async def calculate_cycle_time(self, card_id: str) -> Dict:
        """Calculate cycle time for a card."""
        card = await self.trello.call_tool('get_card', {
            'cardId': card_id
        })

        # Get card activity
        activities = await self.trello.call_tool('get_recent_activity', {
            'limit': 100
        })

        # Filter activities for this card
        card_activities = [
            a for a in activities
            if a.get('data', {}).get('card', {}).get('id') == card_id
        ]

        # Calculate time in each stage
        stage_times = {}
        current_stage = card.get('list', {}).get('name')

        # Simple cycle time calculation
        created_date = datetime.fromisoformat(card.get('dateLastActivity', datetime.now().isoformat()))
        current_date = datetime.now()
        total_cycle_time = current_date - created_date

        return {
            'card_name': card.get('name'),
            'current_stage': current_stage,
            'total_cycle_time_hours': total_cycle_time.total_seconds() / 3600,
            'created': created_date.isoformat(),
            'last_activity': card.get('dateLastActivity')
        }

    async def apply_wip_limits(self, limits: Dict[str, int]):
        """Apply Work-In-Progress limits to lists."""
        for stage, limit in limits.items():
            if stage not in self.stage_lists:
                continue

            # Get cards in this list
            cards = await self.trello.call_tool('get_cards_by_list_id', {
                'listId': self.stage_lists[stage]
            })

            if len(cards) > limit:
                # Create warning card
                await self.trello.call_tool('add_card_to_list', {
                    'listId': self.stage_lists[stage],
                    'name': f'⚠️ WIP LIMIT EXCEEDED',
                    'description': f"""## WIP Limit Violation

The **{stage}** column has exceeded its WIP limit.

- **Current cards**: {len(cards)}
- **WIP Limit**: {limit}
- **Excess**: {len(cards) - limit}

### Action Required
Please complete work in progress before pulling new items.""",
                    'labels': ['warning', 'wip-violation']
                })


# Example 4: Retrospective Management
class RetroManager:
    """Manages sprint retrospectives in Trello."""

    def __init__(self, trello_client: TrelloMCPClient):
        self.trello = trello_client

    async def create_retro_board(self, sprint_number: int) -> Dict:
        """Create a retrospective board with standard columns."""
        # Create lists for retrospective
        retro_lists = {
            "What Went Well": "green",
            "What Could Be Improved": "yellow",
            "Action Items": "red",
            "Kudos": "blue"
        }

        list_ids = {}
        for list_name, color in retro_lists.items():
            list_data = await self.trello.call_tool('add_list_to_board', {
                'name': f"Sprint {sprint_number} - {list_name}"
            })
            list_ids[list_name] = list_data['id']

        # Create intro card
        await self.trello.call_tool('add_card_to_list', {
            'listId': list_ids["What Went Well"],
            'name': f'Sprint {sprint_number} Retrospective',
            'description': f"""# Sprint {sprint_number} Retrospective

## Guidelines
1. Be constructive and specific
2. Focus on process, not people
3. Suggest actionable improvements
4. Celebrate successes

## Format
- **What Went Well**: Positive outcomes and successes
- **What Could Be Improved**: Areas for improvement
- **Action Items**: Specific actions to take
- **Kudos**: Recognition for team members

**Date**: {datetime.now().strftime('%Y-%m-%d')}"""
        })

        return list_ids

    async def add_retro_item(self, list_name: str, title: str,
                            description: str, votes: int = 0):
        """Add an item to the retrospective."""
        lists = await self.trello.call_tool('get_lists')
        target_list = None

        for lst in lists:
            if list_name in lst['name']:
                target_list = lst['id']
                break

        if not target_list:
            raise ValueError(f"List '{list_name}' not found")

        card = await self.trello.call_tool('add_card_to_list', {
            'listId': target_list,
            'name': f"{title} (👍 {votes})",
            'description': f"""{description}

---
**Votes**: {votes}
**Added by**: Team
**Date**: {datetime.now().isoformat()}"""
        })

        return card

    async def convert_to_action_items(self, retro_cards: List[str],
                                     target_board_id: str):
        """Convert retrospective items to actionable tasks."""
        action_items = []

        for card_id in retro_cards:
            # Get card details
            card = await self.trello.call_tool('get_card', {
                'cardId': card_id
            })

            # Create action item in target board
            action_card = await self.trello.call_tool('add_card_to_list', {
                'boardId': target_board_id,
                'listId': 'backlog-list-id',  # Would be fetched dynamically
                'name': f"[RETRO ACTION] {card['name']}",
                'description': f"""## Retrospective Action Item

**Origin**: Sprint Retrospective
**Original Issue**: {card['name']}

### Description
{card.get('desc', 'No description provided')}

### Success Criteria
- [ ] Issue addressed
- [ ] Process updated
- [ ] Team informed
- [ ] Documentation updated

**Created from retro**: {datetime.now().isoformat()}""",
                'labels': ['retro-action', 'improvement']
            })

            action_items.append(action_card)

        return action_items


# Example 5: Project Analytics Dashboard
class ProjectAnalytics:
    """Generate analytics and metrics from Trello boards."""

    def __init__(self, trello_client: TrelloMCPClient):
        self.trello = trello_client

    async def generate_burndown_data(self) -> Dict:
        """Generate data for a burndown chart."""
        lists = await self.trello.call_tool('get_lists')

        burndown_data = {
            'date': datetime.now().isoformat(),
            'total_points': 0,
            'completed_points': 0,
            'remaining_points': 0,
            'by_list': {}
        }

        for lst in lists:
            cards = await self.trello.call_tool('get_cards_by_list_id', {
                'listId': lst['id']
            })

            list_points = 0
            for card in cards:
                # Extract story points from card name (e.g., "[5] Feature Name")
                import re
                points_match = re.match(r'\[(\d+)\]', card.get('name', ''))
                if points_match:
                    points = int(points_match.group(1))
                    list_points += points
                    burndown_data['total_points'] += points

                    if lst['name'] in ['Done', 'Completed', 'Deployed']:
                        burndown_data['completed_points'] += points

            burndown_data['by_list'][lst['name']] = list_points

        burndown_data['remaining_points'] = (
            burndown_data['total_points'] - burndown_data['completed_points']
        )

        return burndown_data

    async def team_velocity_report(self, sprints: int = 3) -> Dict:
        """Calculate team velocity over recent sprints."""
        velocity_data = {
            'sprints': [],
            'average_velocity': 0,
            'trend': 'stable'
        }

        # This would typically look at archived cards with sprint labels
        lists = await self.trello.call_tool('get_lists')
        done_list = None

        for lst in lists:
            if lst['name'] in ['Done', 'Completed']:
                done_list = lst['id']
                break

        if done_list:
            cards = await self.trello.call_tool('get_cards_by_list_id', {
                'listId': done_list
            })

            # Group cards by sprint (simplified - would use labels/dates in practice)
            sprint_points = {}
            for card in cards:
                # Extract sprint number from labels
                for label in card.get('labels', []):
                    if 'sprint-' in label.get('name', '').lower():
                        sprint_num = label['name'].split('-')[1]
                        if sprint_num not in sprint_points:
                            sprint_points[sprint_num] = 0

                        # Extract story points
                        import re
                        points_match = re.match(r'\[(\d+)\]', card.get('name', ''))
                        if points_match:
                            sprint_points[sprint_num] += int(points_match.group(1))

            # Calculate average
            if sprint_points:
                velocities = list(sprint_points.values())
                velocity_data['average_velocity'] = sum(velocities) / len(velocities)

                # Determine trend
                if len(velocities) >= 2:
                    if velocities[-1] > velocities[-2]:
                        velocity_data['trend'] = 'increasing'
                    elif velocities[-1] < velocities[-2]:
                        velocity_data['trend'] = 'decreasing'

        return velocity_data

    async def generate_health_metrics(self) -> Dict:
        """Generate overall project health metrics."""
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'lists': {},
            'overdue_cards': [],
            'blocked_cards': [],
            'stale_cards': [],
            'total_cards': 0,
            'health_score': 100
        }

        lists = await self.trello.call_tool('get_lists')
        now = datetime.now()

        for lst in lists:
            cards = await self.trello.call_tool('get_cards_by_list_id', {
                'listId': lst['id']
            })

            metrics['lists'][lst['name']] = {
                'count': len(cards),
                'percentage': 0
            }
            metrics['total_cards'] += len(cards)

            for card in cards:
                # Check for overdue cards
                if card.get('due'):
                    due_date = datetime.fromisoformat(card['due'].replace('Z', '+00:00'))
                    if due_date < now and not card.get('dueComplete'):
                        metrics['overdue_cards'].append({
                            'name': card['name'],
                            'due': card['due'],
                            'list': lst['name']
                        })
                        metrics['health_score'] -= 5

                # Check for blocked cards
                if any(label.get('name', '') == 'blocked' for label in card.get('labels', [])):
                    metrics['blocked_cards'].append({
                        'name': card['name'],
                        'list': lst['name']
                    })
                    metrics['health_score'] -= 3

                # Check for stale cards (no activity in 14 days)
                if card.get('dateLastActivity'):
                    last_activity = datetime.fromisoformat(
                        card['dateLastActivity'].replace('Z', '+00:00')
                    )
                    if (now - last_activity).days > 14:
                        metrics['stale_cards'].append({
                            'name': card['name'],
                            'last_activity': card['dateLastActivity'],
                            'list': lst['name']
                        })
                        metrics['health_score'] -= 1

        # Calculate percentages
        if metrics['total_cards'] > 0:
            for list_name in metrics['lists']:
                metrics['lists'][list_name]['percentage'] = (
                    metrics['lists'][list_name]['count'] / metrics['total_cards'] * 100
                )

        # Ensure health score doesn't go below 0
        metrics['health_score'] = max(0, metrics['health_score'])

        return metrics


# Example Usage
async def main():
    """Example usage of the Trello automation classes."""

    # Initialize client
    trello = TrelloMCPClient()

    # Task Management Example
    task_manager = TaskManager(trello)
    await task_manager.initialize_priority_lists()

    # Create a high-priority task
    critical_task = Task(
        name="Fix Production Database Issue",
        description="Database connection pool exhaustion causing service outages",
        priority=Priority.CRITICAL,
        assignee="devops-team",
        labels=["production", "database", "incident"],
        checklist_items=[
            "Identify root cause",
            "Implement fix",
            "Test in staging",
            "Deploy to production",
            "Monitor for 24 hours"
        ]
    )

    card = await task_manager.create_task(critical_task)
    print(f"Created critical task: {card['id']}")

    # Kanban Automation Example
    kanban = KanbanAutomation(trello)
    await kanban.setup_kanban_board()

    # Move card through workflow
    await kanban.move_card_to_stage(
        card['id'],
        "In Progress",
        "Started investigation into database connection issues"
    )

    # Apply WIP limits
    await kanban.apply_wip_limits({
        "In Progress": 3,
        "Review": 2,
        "Testing": 2
    })

    # Analytics Example
    analytics = ProjectAnalytics(trello)

    # Generate health metrics
    health = await analytics.generate_health_metrics()
    print(f"Project Health Score: {health['health_score']}/100")
    print(f"Overdue Cards: {len(health['overdue_cards'])}")
    print(f"Blocked Cards: {len(health['blocked_cards'])}")

    # Generate burndown data
    burndown = await analytics.generate_burndown_data()
    print(f"Sprint Progress: {burndown['completed_points']}/{burndown['total_points']} points")

    # Retrospective Example
    retro = RetroManager(trello)
    retro_lists = await retro.create_retro_board(sprint_number=23)

    # Add retrospective items
    await retro.add_retro_item(
        "What Went Well",
        "Completed all planned features",
        "The team delivered all committed user stories for the sprint",
        votes=8
    )

    await retro.add_retro_item(
        "What Could Be Improved",
        "Better estimation of complex tasks",
        "Several tasks took longer than estimated, causing end-of-sprint rush",
        votes=5
    )


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())