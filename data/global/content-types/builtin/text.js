//CHECKSUM:f75a8794018578d3efe8b53b4895d2e4684d7562c1ee71fdbd175a4ef4eabc5e
"use strict";

const base = require('./_base');

function render(data) {
  const events = [];

  if (data.typing) {
    events.push({
      type: 'typing',
      value: data.typing
    });
  }

  return [...events, {
    type: 'text',
    markdown: true,
    text: data.text
  }];
}

function renderElement(data, channel) {
  if (channel === 'web' || channel === 'api' || channel === 'telegram') {
    return render(data);
  }

  return []; // TODO
}

module.exports = {
  id: 'builtin_text',
  group: 'Built-in Messages',
  title: 'Text',
  jsonSchema: {
    description: 'A regular text message with optional typing indicators and alternates',
    type: 'object',
    required: ['text'],
    properties: {
      text: {
        type: 'string',
        title: 'Message'
      },
      variations: {
        type: 'array',
        title: 'Alternates (optional)',
        items: {
          type: 'string',
          default: ''
        }
      },
      ...base.typingIndicators
    }
  },
  uiSchema: {
    text: {
      'ui:widget': 'textarea'
    },
    variations: {
      'ui:options': {
        orderable: false
      }
    }
  },
  computePreviewText: formData => 'Text: ' + formData.text,
  renderElement: renderElement
};