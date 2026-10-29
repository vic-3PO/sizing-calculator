/**
 * DSL Parser for Sizing Calculator
 * 
 * Syntax:
 * task "Task Name" {
 *   duration: 5;
 *   priority: high;
 *   category: "Development";
 *   start: 0;
 *   after: "Previous Task";
 * }
 */

class DSLParser {
  constructor() {
    this.priorities = ['low', 'medium', 'high'];
  }

  parse(code) {
    const tasks = [];
    const lines = code.split('\n');
    let currentTask = null;
    let braceLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line || line.startsWith('//')) continue;

      // Start of task
      const taskMatch = line.match(/^task\s+"([^"]+)"\s*\{/);
      if (taskMatch) {
        currentTask = {
          name: taskMatch[1],
          duration: 1,
          priority: 'medium',
          category: 'Geral',
          start: 0,
          dependencies: []
        };
        braceLevel++;
        continue;
      }

      if (line === '}') {
        if (currentTask) {
          tasks.push(currentTask);
          currentTask = null;
        }
        braceLevel--;
        continue;
      }

      if (currentTask && braceLevel > 0) {
        // Parse properties
        const propMatch = line.match(/^(\w+)\s*:\s*([^;]+);?/);
        if (propMatch) {
          const key = propMatch[1].toLowerCase();
          let value = propMatch[2].trim().replace(/^"(.*)"$/, '$1');

          switch (key) {
            case 'duration':
              currentTask.duration = parseFloat(value) || 1;
              break;
            case 'priority':
              currentTask.priority = this.priorities.includes(value.toLowerCase()) ? value.toLowerCase() : 'medium';
              break;
            case 'category':
              currentTask.category = value;
              break;
            case 'start':
              currentTask.start = parseFloat(value) || 0;
              break;
            case 'after':
              currentTask.afterTaskName = value; // Temporary, will resolve to ID later
              break;
            case 'logic':
              currentTask.logic = value;
              break;
          }
        }
      }
    }

    return tasks;
  }

  /**
   * Generates DSL code from task objects
   */
  generate(tasks) {
    return tasks.map(task => {
      let dsl = `task "${task.name}" {\n`;
      dsl += `  duration: ${task.duration};\n`;
      dsl += `  priority: ${task.priority};\n`;
      dsl += `  category: "${task.category}";\n`;
      if (task.logic) {
        dsl += `  logic: "${task.logic.replace(/\n/g, '\\n').replace(/"/g, '\\"')}";\n`;
      }

      if (task.dependencies && task.dependencies.length > 0) {
        // Resolve IDs to names
        const depNames = task.dependencies.map(depId => {
          const depTask = tasks.find(t => t.id === depId);
          return depTask ? `"${depTask.name}"` : null;
        }).filter(name => name !== null);

        if (depNames.length > 0) {
          dsl += `  after: ${depNames[0]};\n`; // Using first dependency for simplicity in DSL
        }
      } else if (task.start > 0) {
        dsl += `  start: ${task.start};\n`;
      }

      dsl += `}`;
      return dsl;
    }).join('\n\n');
  }
}
