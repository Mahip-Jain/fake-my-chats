import { useState, useEffect } from "react";
import "./App.css";

function App() {
	const [inputString, setInputString] = useState([]);
	const [messages, setMessages] = useState([]);
	useEffect(() => {
		function parseInputString() {
			// This function can be used to parse the input string if needed
			// For now, it just returns the input string
			let output = [];
			let person = -1;
			for (let i = 0; i < inputString.length; i++) {
				if (
					person == -1 &&
					!inputString[i].startsWith("<") &&
					!inputString[i].startsWith(">")
				)
					continue; // Skip false/empty lines in the start
				console.log("def real");
				if (inputString[i].startsWith(">")) {
					person = 0; // sender
					inputString[i] = inputString[i].slice(1).trim(); // Remove the > from the message
				} else if (inputString[i].startsWith("<")) {
					// If the line starts with <, it is a message from the receiver
					person = 1;
					inputString[i] = inputString[i].slice(1).trim(); // Remove the < from the message
				} else {
					// figure out how to add to the previous message with a new line
					// if (output.length > 0) {
					// 	output[output.length - 1].props.children.props.children +=
					// 		"\n" + inputString[i];
					// 	continue; // Skip adding a new message container
					// }
					// this doesn't work children is read only
					output[output.length - 1].text += "\n" + inputString[i];
					continue; // Skip adding a new message container
				}
				console.log(inputString[i]);
				output.push(
					// <div
					// 	key={i}
					// 	className={`message_container ${person === 0 ? "sender" : "receiver"}`}
					// 	style={{
					// 		backgroundColor: person === 0 ? "#e1ffc7" : "#d1e7ff",
					// 		padding: "10px",
					// 		borderRadius: "10px",
					// 		margin: "5px 0",
					// 		display: "inline-block",
					// 		maxWidth: "65%",
					// 		alignSelf: person === 0 ? "flex-end" : "flex-start",
					// 	}}
					// >
					// 	<p className="message" style={{ textAlign: "left" }}>
					// 		{inputString[i]}
					// 	</p>
					// </div>
					{ sender: person, text: inputString[i] }
				);
			}
			return output;
		}
		setMessages(parseInputString());
	}, [inputString]);

	return (
		<div className="App">
			<h1>Fake My Chats</h1>
			<p>
				Instantly create fake text messages in any social media platform or messaging
				service for free.
			</p>
			<p>Fully customizable and easy to use.</p>
			<div
				className="ui-container"
				style={{ display: "flex", justifyContent: "space-between" }}
			>
				<div className="input" style={{ width: "40%" }}>
					{/* Input will be displayed here */}
					<div className="editor">
						<textarea
							onChange={(e) => {
								console.log(e.target.value);
								setInputString(e.target.value.split("\n"));
							}}
							placeholder="Enter your messages here..."
							className="messages-input"
							style={{
								width: "100%",
								height: "70vh",
								borderRadius: "10px",
								padding: "10px",
								border: "1px solid #ccc",
								resize: "vertical",
							}}
						></textarea>
					</div>
				</div>
				<div className="output" style={{ width: "40%" }}>
					{/* Output will be displayed here */}
					<div className="screen" style={{ display: "flex", flexDirection: "column" }}>
						{messages.map((message, key) => {
							function parseWhatsAppFormatting(text) {
								const TAGS = {
									"*": "strong",
									_: "em",
									"~": "s",
									"`": "code",
								};

								const result = [];
								let buffer = "";
								let i = 0;
								let key = 0;

								const flushBuffer = () => {
									if (buffer) {
										result.push(<span key={key++}>{buffer}</span>);
										buffer = "";
									}
								};

								while (i < text.length) {
									const char = text[i];

									if (TAGS[char]) {
										// Check for balanced marker (e.g. *...*)
										const end = text.indexOf(char, i + 1);
										if (end !== -1) {
											flushBuffer(); // output any plain text before
											const content = text.slice(i + 1, end);
											const inner = parseWhatsAppFormatting(content); // recursive parsing for nesting

											if (char === "`") {
												result.push(
													<code
														key={key++}
														style={{
															fontFamily: "monospace",
															backgroundColor: "#f1f1f1",
															padding: "2px 4px",
															borderRadius: "3px",
														}}
													>
														{inner}
													</code>
												);
											} else {
												const Tag = TAGS[char];
												result.push(<Tag key={key++}>{inner}</Tag>);
											}

											i = end + 1;
											continue;
										}
									}

									buffer += char;
									i++;
								}

								flushBuffer();
								return result;
							}

							return (
								<div
									key={key}
									className={`message_container ${message.sender === 0 ? "sender" : "receiver"}`}
									style={{
										backgroundColor: message.sender === 0 ? "#e1ffc7" : "#d1e7ff",
										padding: "10px",
										borderRadius: "10px",
										margin: "5px 0",
										display: "inline-block",
										maxWidth: "65%",
										alignSelf: message.sender === 0 ? "flex-end" : "flex-start",
									}}
								>
									<p className="message" style={{ textAlign: "left", whiteSpace: "pre-wrap" }}>
										{parseWhatsAppFormatting(message.text)}
									</p>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
// TODO: Add styling for the phone, figure out variable styling for different phones/devices
// TODO: Add styling and features for each platform we'll stick to only a few for now right
//whatsapp, imessage, instagram, slack, discord, snapchat, tinder
// different features for each platform
// have the option to switch between a text based editor and a WYSIWYG editor and a form based editor
// TODO: Add a button to clear the input and output
// TODO: Add a button to download the output as an image or PDF
// TODO: Add a button to share the output on social media
