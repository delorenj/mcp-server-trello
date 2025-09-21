# MCP Server Trello - Usage Examples

This document provides comprehensive examples of using the MCP Server Trello tools for various workflows and scenarios.

## Table of Contents

1. [Initial Setup and Configuration](#initial-setup-and-configuration)
2. [Board and Workspace Management](#board-and-workspace-management)
3. [Card Management Workflows](#card-management-workflows)
4. [List Operations](#list-operations)
5. [Checklist Management](#checklist-management)
6. [Comments and Collaboration](#comments-and-collaboration)
7. [File and Image Attachments](#file-and-image-attachments)
8. [Advanced Workflows](#advanced-workflows)
9. [Real-World Scenarios](#real-world-scenarios)

## Initial Setup and Configuration

### Example 1: Setting up your environment

First, configure your Trello credentials in your MCP client configuration:

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["@delorenj/mcp-server-trello"],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token",
        "TRELLO_BOARD_ID": "optional-default-board-id"
      }
    }
  }
}
```

### Example 2: Finding your workspace and boards

```javascript
// List all available workspaces
await use_mcp_tool({
  server_name: "trello",
  tool_name: "list_workspaces",
  arguments: {}
});

// List all boards you have access to
await use_mcp_tool({
  server_name: "trello",
  tool_name: "list_boards",
  arguments: {}
});

// Set an active workspace for the session
await use_mcp_tool({
  server_name: "trello",
  tool_name: "set_active_workspace",
  arguments: {
    workspaceId: "60a7b5c9e4b0d8f12345678"
  }
});

// List boards in a specific workspace
await use_mcp_tool({
  server_name: "trello",
  tool_name: "list_boards_in_workspace",
  arguments: {
    workspaceId: "60a7b5c9e4b0d8f12345678"
  }
});

// Set an active board for future operations
await use_mcp_tool({
  server_name: "trello",
  tool_name: "set_active_board",
  arguments: {
    boardId: "5d5a4b8f9e4b0d8123456789"
  }
});
```

## Board and Workspace Management

### Example 3: Creating a new board

```javascript
// Create a board with default settings
await use_mcp_tool({
  server_name: "trello",
  tool_name: "create_board",
  arguments: {
    name: "Q1 2025 Product Roadmap",
    desc: "Quarterly planning and feature tracking for Q1 2025",
    defaultLabels: true,
    defaultLists: true
  }
});

// Create a board in a specific workspace without default lists
await use_mcp_tool({
  server_name: "trello",
  tool_name: "create_board",
  arguments: {
    name: "Customer Support Tickets",
    desc: "Track and manage customer support issues",
    idOrganization: "60a7b5c9e4b0d8f12345678",
    defaultLabels: true,
    defaultLists: false
  }
});
```

### Example 4: Managing active board context

```javascript
// Check current active board
await use_mcp_tool({
  server_name: "trello",
  tool_name: "get_active_board_info",
  arguments: {}
});

// Switch to a different board
await use_mcp_tool({
  server_name: "trello",
  tool_name: "set_active_board",
  arguments: {
    boardId: "new-board-id-here"
  }
});
```

## Card Management Workflows

### Example 5: Creating cards with full details

```javascript
// Create a feature card with all details
await use_mcp_tool({
  server_name: "trello",
  tool_name: "add_card_to_list",
  arguments: {
    listId: "5e5a4b8f9e4b0d8123456790",
    name: "Implement OAuth 2.0 Authentication",
    description: "## Overview\nAdd OAuth 2.0 support for third-party integrations\n\n## Requirements\n- Support Google OAuth\n- Support GitHub OAuth\n- Implement refresh token flow\n\n## Technical Notes\n- Use passport.js for authentication\n- Store tokens securely in database",
    dueDate: "2025-02-15T17:00:00Z",
    start: "2025-02-01",
    labels: ["urgent", "backend", "security"]
  }
});
```

### Example 6: Updating existing cards

```javascript
// Update card details including marking as complete
await use_mcp_tool({
  server_name: "trello",
  tool_name: "update_card_details",
  arguments: {
    cardId: "5f5a4b8f9e4b0d8123456791",
    name: "OAuth Implementation - COMPLETED",
    description: "✅ OAuth 2.0 implementation completed\n\nImplemented providers:\n- Google OAuth ✅\n- GitHub OAuth ✅\n- Microsoft Azure AD ✅",
    dueComplete: true,
    labels: ["completed", "backend"]
  }
});
```

### Example 7: Getting comprehensive card data

```javascript
// Get full card details in JSON format
const cardData = await use_mcp_tool({
  server_name: "trello",
  tool_name: "get_card",
  arguments: {
    cardId: "FdhbArbK",
    includeMarkdown: false
  }
});

// Get card data as formatted markdown
const cardMarkdown = await use_mcp_tool({
  server_name: "trello",
  tool_name: "get_card",
  arguments: {
    cardId: "FdhbArbK",
    includeMarkdown: true
  }
});
```

### Example 8: Managing card lifecycle

```javascript
// Move card to "In Progress" list
await use_mcp_tool({
  server_name: "trello",
  tool_name: "move_card",
  arguments: {
    cardId: "5f5a4b8f9e4b0d8123456791",
    listId: "in-progress-list-id"
  }
});

// Archive completed card
await use_mcp_tool({
  server_name: "trello",
  tool_name: "archive_card",
  arguments: {
    cardId: "5f5a4b8f9e4b0d8123456791"
  }
});
```

## List Operations

### Example 9: Creating and managing lists

```javascript
// Create a custom workflow with lists
const lists = ["Backlog", "To Do", "In Progress", "Code Review", "Testing", "Done"];

for (const listName of lists) {
  await use_mcp_tool({
    server_name: "trello",
    tool_name: "add_list_to_board",
    arguments: {
      name: listName
    }
  });
}

// Get all lists on current board
const boardLists = await use_mcp_tool({
  server_name: "trello",
  tool_name: "get_lists",
  arguments: {}
});

// Get cards from a specific list
await use_mcp_tool({
  server_name: "trello",
  tool_name: "get_cards_by_list_id",
  arguments: {
    listId: "5e5a4b8f9e4b0d8123456790"
  }
});
```

### Example 10: Archiving old lists

```javascript
// Archive a completed sprint list
await use_mcp_tool({
  server_name: "trello",
  tool_name: "archive_list",
  arguments: {
    listId: "old-sprint-list-id"
  }
});
```

## Checklist Management

### Example 11: Creating and managing checklists

```javascript
// Get all items from "Acceptance Criteria" checklist
const acceptanceCriteria = await use_mcp_tool({
  server_name: "trello",
  tool_name: "get_acceptance_criteria",
  arguments: {}
});

// Add item to a checklist
await use_mcp_tool({
  server_name: "trello",
  tool_name: "add_checklist_item",
  arguments: {
    text: "User can login with email and password",
    checkListName: "Acceptance Criteria"
  }
});

// Get complete checklist with completion percentage
const checklist = await use_mcp_tool({
  server_name: "trello",
  tool_name: "get_checklist_by_name",
  arguments: {
    name: "Development Tasks"
  }
});
console.log(`Checklist ${checklist.percentComplete}% complete`);
```

### Example 12: Searching checklist items

```javascript
// Find all checklist items mentioning "API"
const apiItems = await use_mcp_tool({
  server_name: "trello",
  tool_name: "find_checklist_items_by_description",
  arguments: {
    description: "API"
  }
});

// Get all items from a specific checklist
const deploymentChecklist = await use_mcp_tool({
  server_name: "trello",
  tool_name: "get_checklist_items",
  arguments: {
    name: "Deployment Checklist"
  }
});
```

## Comments and Collaboration

### Example 13: Adding and updating comments

```javascript
// Add a status update comment
await use_mcp_tool({
  server_name: "trello",
  tool_name: "add_comment",
  arguments: {
    cardId: "5f5a4b8f9e4b0d8123456791",
    text: "🚀 Deployment completed successfully!\n\n**Environment**: Production\n**Version**: v2.3.1\n**Deployed by**: @johndoe\n**Time**: 2025-01-21 15:30 UTC"
  }
});

// Update an existing comment
await use_mcp_tool({
  server_name: "trello",
  tool_name: "update_comment",
  arguments: {
    commentId: "comment-id-here",
    text: "UPDATE: Rollback performed due to performance issues. Investigating root cause."
  }
});
```

## File and Image Attachments

### Example 14: Attaching images to cards

```javascript
// Attach a screenshot to a bug report card
await use_mcp_tool({
  server_name: "trello",
  tool_name: "attach_image_to_card",
  arguments: {
    cardId: "bug-report-card-id",
    imageUrl: "https://example.com/screenshots/bug-console-error.png",
    name: "Console Error Screenshot"
  }
});

// Attach a design mockup
await use_mcp_tool({
  server_name: "trello",
  tool_name: "attach_image_to_card",
  arguments: {
    cardId: "feature-card-id",
    imageUrl: "https://figma.com/exports/dashboard-mockup.png",
    name: "Dashboard UI Mockup v2"
  }
});
```

### Example 15: Attaching various file types

```javascript
// Attach a PDF document
await use_mcp_tool({
  server_name: "trello",
  tool_name: "attach_file_to_card",
  arguments: {
    cardId: "project-card-id",
    fileUrl: "https://docs.example.com/project-specification.pdf",
    name: "Project Specification v1.2",
    mimeType: "application/pdf"
  }
});

// Attach a video recording
await use_mcp_tool({
  server_name: "trello",
  tool_name: "attach_file_to_card",
  arguments: {
    cardId: "demo-card-id",
    fileUrl: "https://videos.example.com/product-demo.mp4",
    name: "Product Demo Recording",
    mimeType: "video/mp4"
  }
});

// Attach a local file
await use_mcp_tool({
  server_name: "trello",
  tool_name: "attach_file_to_card",
  arguments: {
    cardId: "documentation-card-id",
    fileUrl: "file:///Users/john/Documents/api-docs.md",
    name: "API Documentation",
    mimeType: "text/markdown"
  }
});
```

## Advanced Workflows

### Example 16: Sprint planning workflow

```javascript
// Sprint planning: Move selected cards to sprint backlog
async function planSprint(sprintListId, cardIds) {
  for (const cardId of cardIds) {
    // Move card to sprint list
    await use_mcp_tool({
      server_name: "trello",
      tool_name: "move_card",
      arguments: {
        cardId: cardId,
        listId: sprintListId
      }
    });

    // Add sprint label
    await use_mcp_tool({
      server_name: "trello",
      tool_name: "update_card_details",
      arguments: {
        cardId: cardId,
        labels: ["sprint-23", "q1-2025"]
      }
    });

    // Add comment about sprint assignment
    await use_mcp_tool({
      server_name: "trello",
      tool_name: "add_comment",
      arguments: {
        cardId: cardId,
        text: "Assigned to Sprint 23 (Jan 22 - Feb 5, 2025)"
      }
    });
  }
}
```

### Example 17: Daily standup helper

```javascript
// Get all cards assigned to current user
async function getMyDailyUpdate() {
  const myCards = await use_mcp_tool({
    server_name: "trello",
    tool_name: "get_my_cards",
    arguments: {}
  });

  // Categorize by list
  const cardsByStatus = {
    inProgress: [],
    blocked: [],
    completed: []
  };

  for (const card of myCards) {
    // Get full card details including list
    const fullCard = await use_mcp_tool({
      server_name: "trello",
      tool_name: "get_card",
      arguments: {
        cardId: card.id,
        includeMarkdown: false
      }
    });

    // Categorize based on list name
    if (fullCard.list.name === "In Progress") {
      cardsByStatus.inProgress.push(fullCard);
    } else if (fullCard.list.name === "Blocked") {
      cardsByStatus.blocked.push(fullCard);
    } else if (fullCard.list.name === "Done") {
      cardsByStatus.completed.push(fullCard);
    }
  }

  return cardsByStatus;
}
```

### Example 18: Activity monitoring

```javascript
// Monitor recent board activity
async function monitorBoardActivity(limit = 20) {
  const activities = await use_mcp_tool({
    server_name: "trello",
    tool_name: "get_recent_activity",
    arguments: {
      limit: limit
    }
  });

  // Filter for important updates
  const importantActivities = activities.filter(activity => {
    return activity.type === 'commentCard' ||
           activity.type === 'addAttachmentToCard' ||
           activity.type === 'updateCard' ||
           activity.type === 'moveCardToBoard';
  });

  return importantActivities;
}
```

## Real-World Scenarios

### Example 19: Bug tracking workflow

```javascript
async function createBugReport(bugDetails) {
  // Create bug card
  const bugCard = await use_mcp_tool({
    server_name: "trello",
    tool_name: "add_card_to_list",
    arguments: {
      listId: "bug-triage-list-id",
      name: `BUG: ${bugDetails.title}`,
      description: `## Bug Report\n\n**Severity**: ${bugDetails.severity}\n**Environment**: ${bugDetails.environment}\n\n### Description\n${bugDetails.description}\n\n### Steps to Reproduce\n${bugDetails.steps}\n\n### Expected Behavior\n${bugDetails.expected}\n\n### Actual Behavior\n${bugDetails.actual}`,
      labels: ["bug", bugDetails.severity],
      dueDate: bugDetails.severity === "critical" ?
               new Date(Date.now() + 24*60*60*1000).toISOString() : // 24 hours for critical
               new Date(Date.now() + 72*60*60*1000).toISOString()   // 72 hours for others
    }
  });

  // Add acceptance criteria checklist
  await use_mcp_tool({
    server_name: "trello",
    tool_name: "add_checklist_item",
    arguments: {
      text: "Bug is reproducible",
      checkListName: "QA Checklist"
    }
  });

  await use_mcp_tool({
    server_name: "trello",
    tool_name: "add_checklist_item",
    arguments: {
      text: "Root cause identified",
      checkListName: "QA Checklist"
    }
  });

  await use_mcp_tool({
    server_name: "trello",
    tool_name: "add_checklist_item",
    arguments: {
      text: "Fix implemented and tested",
      checkListName: "QA Checklist"
    }
  });

  await use_mcp_tool({
    server_name: "trello",
    tool_name: "add_checklist_item",
    arguments: {
      text: "Regression tests added",
      checkListName: "QA Checklist"
    }
  });

  // Attach screenshot if provided
  if (bugDetails.screenshotUrl) {
    await use_mcp_tool({
      server_name: "trello",
      tool_name: "attach_image_to_card",
      arguments: {
        cardId: bugCard.id,
        imageUrl: bugDetails.screenshotUrl,
        name: "Bug Screenshot"
      }
    });
  }

  // Attach logs if provided
  if (bugDetails.logsUrl) {
    await use_mcp_tool({
      server_name: "trello",
      tool_name: "attach_file_to_card",
      arguments: {
        cardId: bugCard.id,
        fileUrl: bugDetails.logsUrl,
        name: "Error Logs",
        mimeType: "text/plain"
      }
    });
  }

  return bugCard;
}
```

### Example 20: Release management

```javascript
async function prepareRelease(version, releaseDate) {
  // Create release card
  const releaseCard = await use_mcp_tool({
    server_name: "trello",
    tool_name: "add_card_to_list",
    arguments: {
      listId: "releases-list-id",
      name: `Release ${version}`,
      description: `# Release ${version}\n\n**Target Date**: ${releaseDate}\n**Status**: Preparing`,
      dueDate: new Date(releaseDate).toISOString(),
      labels: ["release", "high-priority"]
    }
  });

  // Add release checklist items
  const releaseChecklist = [
    "Code freeze completed",
    "All tests passing",
    "Security scan completed",
    "Performance benchmarks verified",
    "Documentation updated",
    "Release notes prepared",
    "Stakeholders notified",
    "Deployment plan reviewed",
    "Rollback plan prepared",
    "Production deployment completed"
  ];

  for (const item of releaseChecklist) {
    await use_mcp_tool({
      server_name: "trello",
      tool_name: "add_checklist_item",
      arguments: {
        text: item,
        checkListName: "Release Checklist"
      }
    });
  }

  // Find all cards targeted for this release
  const allCards = await use_mcp_tool({
    server_name: "trello",
    tool_name: "get_cards_by_list_id",
    arguments: {
      listId: "done-list-id"
    }
  });

  // Link related cards by adding comments
  for (const card of allCards) {
    if (card.labels.includes(`release-${version}`)) {
      await use_mcp_tool({
        server_name: "trello",
        tool_name: "add_comment",
        arguments: {
          cardId: card.id,
          text: `Included in Release ${version} - https://trello.com/c/${releaseCard.shortLink}`
        }
      });
    }
  }

  return releaseCard;
}
```

### Example 21: Project health dashboard

```javascript
async function generateProjectHealthReport() {
  // Get all lists
  const lists = await use_mcp_tool({
    server_name: "trello",
    tool_name: "get_lists",
    arguments: {}
  });

  const report = {
    date: new Date().toISOString(),
    lists: {},
    metrics: {
      totalCards: 0,
      overdueCards: [],
      blockedCards: [],
      completionRate: 0
    }
  };

  // Analyze each list
  for (const list of lists) {
    const cards = await use_mcp_tool({
      server_name: "trello",
      tool_name: "get_cards_by_list_id",
      arguments: {
        listId: list.id
      }
    });

    report.lists[list.name] = {
      cardCount: cards.length,
      cards: cards
    };

    report.metrics.totalCards += cards.length;

    // Check for overdue cards
    const now = new Date();
    for (const card of cards) {
      if (card.due && new Date(card.due) < now && !card.dueComplete) {
        report.metrics.overdueCards.push({
          name: card.name,
          due: card.due,
          list: list.name
        });
      }

      // Check for blocked cards (by label)
      if (card.labels && card.labels.some(label => label.name === "blocked")) {
        report.metrics.blockedCards.push({
          name: card.name,
          list: list.name
        });
      }
    }
  }

  // Calculate completion rate
  const doneCards = report.lists["Done"]?.cardCount || 0;
  if (report.metrics.totalCards > 0) {
    report.metrics.completionRate = (doneCards / report.metrics.totalCards) * 100;
  }

  // Get recent activity
  const recentActivity = await use_mcp_tool({
    server_name: "trello",
    tool_name: "get_recent_activity",
    arguments: {
      limit: 50
    }
  });

  report.recentActivity = recentActivity;

  return report;
}
```

### Example 22: AI-powered workflow with Ideogram integration

```javascript
// Generate and attach AI images to cards
async function addAIGeneratedMockup(cardId, designPrompt) {
  // Generate image using Ideogram MCP server
  const generatedImage = await use_mcp_tool({
    server_name: "ideogram",
    tool_name: "generate_image",
    arguments: {
      prompt: designPrompt,
      aspect_ratio: "16:9",
      model: "V_2"
    }
  });

  // Attach the generated image to Trello card
  await use_mcp_tool({
    server_name: "trello",
    tool_name: "attach_image_to_card",
    arguments: {
      cardId: cardId,
      imageUrl: generatedImage.data[0].url,
      name: `AI Mockup - ${new Date().toLocaleDateString()}`
    }
  });

  // Add a comment about the generation
  await use_mcp_tool({
    server_name: "trello",
    tool_name: "add_comment",
    arguments: {
      cardId: cardId,
      text: `🎨 AI-generated mockup added\n\n**Prompt used**: ${designPrompt}\n**Generated at**: ${new Date().toISOString()}`
    }
  });
}
```

## Best Practices

1. **Always handle errors**: Wrap MCP tool calls in try-catch blocks for production use
2. **Use boardId parameter**: When working with multiple boards, always specify the boardId
3. **Batch operations**: Group related operations together to minimize API calls
4. **Monitor rate limits**: The server handles rate limiting automatically, but be aware of the limits
5. **Use meaningful names**: Use descriptive names for cards, lists, and attachments
6. **Leverage labels**: Use labels to categorize and filter cards effectively
7. **Add context with comments**: Use comments to provide updates and context
8. **Structure descriptions**: Use markdown in descriptions for better formatting
9. **Set appropriate due dates**: Use due dates to track deadlines
10. **Archive completed items**: Keep boards clean by archiving completed cards and lists

## Error Handling

```javascript
try {
  const result = await use_mcp_tool({
    server_name: "trello",
    tool_name: "add_card_to_list",
    arguments: {
      listId: "list-id",
      name: "New Task"
    }
  });
  console.log("Card created successfully:", result);
} catch (error) {
  console.error("Failed to create card:", error);
  // Handle error appropriately
  // - Retry with exponential backoff for rate limits
  // - Log and alert for authentication errors
  // - Validate inputs for validation errors
}
```

## Conclusion

These examples demonstrate the versatility and power of the MCP Server Trello. From simple card creation to complex project management workflows, the server provides all the tools needed to automate and enhance your Trello workflow.

For more information, refer to the main README.md file and the API documentation.
