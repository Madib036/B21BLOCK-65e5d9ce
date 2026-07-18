// This is the data channel set up in the browser code above...
const dc = pc.createDataChannel("oai-events");

// Listen for server events
dc.addEventListener("message", (e) => {
  const event = JSON.parse(e.data);
  console.log(event);
});

// Send client events
const event = {
  type: "conversation.item.create",
  item: {
    type: "message",
    role: "user",
    content: [
      {
        type: "input_text",
        text: "hello there!",
      },
    ],
  },
};
dc.send(JSON.stringify(event));