//CHECKSUM:8e3420be4703a60801b09e77d08d0a110084186baacea2137b0828f82d86ce21
"use strict";

const base = require('./_base');

const Card = require('./card');

const url = require('url');

function render(data) {
  const events = [];

  if (data.typing) {
    events.push({
      type: 'typing',
      value: data.typing
    });
  }

  return [...events, {
    text: ' ',
    type: 'carousel',
    elements: data.items.map(card => ({
      title: card.title,
      picture: card.image ? url.resolve(data.BOT_URL, card.image) : null,
      subtitle: card.subtitle,
      buttons: (card.actions || []).map(a => {
        if (a.action === 'Say something') {
          return {
            title: a.title,
            payload: a.title
          };
        } else if (a.action === 'Open URL') {
          return {
            title: a.title,
            url: a.url.replace('BOT_URL', data.BOT_URL)
          };
        } else {
          throw new Error(`Webchat carousel does not support "${a.action}" action-buttons at the moment`);
        }
      })
    }))
  }];
}

function renderElement(data, channel) {
  if (channel === 'web' || channel === 'api' || channel === 'telegram') {
    return render(data);
  }

  return []; // TODO Handle channel not supported
}

module.exports = {
  id: 'builtin_carousel',
  group: 'Built-in Messages',
  title: 'Carousel',
  jsonSchema: {
    description: 'A carousel is an array of cards',
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        title: 'Carousel Cards',
        items: Card.jsonSchema
      },
      ...base.typingIndicators
    }
  },
  computePreviewText: formData => `Carousel: ${formData.length}`,
  renderElement: renderElement
};