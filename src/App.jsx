import React, { useState, useCallback } from "react";
import escapeHtml from "escape-html";
import { createEditor, Editor, Node, Text } from "slate";
import { Slate, Editable, withReact } from "slate-react";
import isHotkey from "is-hotkey";
import "./App.css";

// Define hotkeys and corresponding formats
const HOTKEYS = {
	"mod+b": "bold",
	"mod+i": "italic",
	"mod+shift+x": "strikethrough",
	"mod+e": "code",
};

// Toolbar button component
const ToolbarButton = ({ format, icon, editor }) => {
	const isActive = isMarkActive(editor, format);

	return (
		<button
			onMouseDown={(e) => {
				e.preventDefault();
				toggleMark(editor, format);
			}}
			className={isActive ? "active" : ""}
			style={{ marginRight: 8 }}
		>
			{icon}
		</button>
	);
};

// Mark helpers
const isMarkActive = (editor, format) => {
	const marks = Editor.marks(editor);
	return marks ? marks[format] === true : false;
};

const toggleMark = (editor, format) => {
	const isActive = isMarkActive(editor, format);
	if (isActive) Editor.removeMark(editor, format);
	else Editor.addMark(editor, format, true);
};

// Leaf renderer for marks, including inline code
const Leaf = ({ attributes, children, leaf }) => {
	if (leaf.bold) children = <strong>{children}</strong>;
	if (leaf.italic) children = <em>{children}</em>;
	if (leaf.strikethrough) children = <del>{children}</del>;
	if (leaf.code)
		children = (
			<code
				style={{ background: "#f0f0f0", padding: "2px 4px", borderRadius: "4px" }}
			>
				{children}
			</code>
		);
	return <span {...attributes}>{children}</span>;
};

function App() {
	const [editor] = useState(() => withReact(createEditor()));
	const [output, setOutput] = useState("A line of text in a paragraph.");
	const renderLeaf = useCallback((props) => <Leaf {...props} />, []);

	const initialValue = [
		{
			type: "paragraph",
			children: [{ text: "A line of text in a paragraph." }],
		},
	];

	const parseSlateValue = (value) => {
		let clone = JSON.parse(JSON.stringify(value));
		console.log(clone);
		// check if first node is a paragraph
		for (let i = 0; i < clone.length; i++) {
			let node = clone[i];
			// check if node starts with >
			if (node.children[0].text.startsWith(">")) {
				// remove > from the start
				node.children[0].text = node.children[0].text.replace(">", "").trim();
				node.sender = 0; // 0 for sender
			} else if (node.children[0].text.startsWith("<")) {
				// remove < from the start
				node.children[0].text = node.children[0].text.replace("<", "").trim();
				node.sender = 1; // 1 for receiver
			} else if (i == 0) {
				clone.splice(0, 1);
				i--;
				continue;
			} else {
				clone[i - 1].children.push({ text: "\n" });
				clone[i - 1].children.push(...node.children);
				clone.splice(i, 1);
				i--;
				continue;
			}
		}
		return clone;
	};

	const serialize = (node) => {
		if (Text.isText(node)) {
			let string = escapeHtml(node.text);
			if (node.bold) string = `<strong>${string}</strong>`;
			if (node.italic) string = `<em>${string}</em>`;
			if (node.strikethrough) string = `<del>${string}</del>`;
			if (node.code) string = `<code>${string}</code>`;
			return string;
		}

		const children = node.children.map((n) => serialize(n)).join("");

		switch (node.type) {
			case "quote":
				return `<blockquote><p>${children}</p></blockquote>`;
			case "paragraph":
				return `<div style="align-self:${
					node.sender == 0 ? "flex-end" : "flex-start"
				}" class="message_container ${
					node.sender == 0 ? "outgoing_msg" : "incoming_msg"
				}"><p>${children}</p></div>`;
			case "link":
				return `<a href="${escapeHtml(node.url)}">${children}</a>`;
			default:
				return children;
		}
	};

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
				{/* Editor with toolbar */}
				<div className="input" style={{ width: "40%" }}>
					<div className="toolbar" style={{ marginBottom: 8 }}>
						<ToolbarButton format="bold" icon="B" editor={editor} />
						<ToolbarButton format="italic" icon="I" editor={editor} />
						<ToolbarButton format="strikethrough" icon="S" editor={editor} />
						<ToolbarButton format="code" icon="< >" editor={editor} />
					</div>
					<div
						className="editor"
						style={{ padding: 8, border: "1px solid #ccc", minHeight: 150 }}
					>
						<Slate
							editor={editor}
							initialValue={initialValue}
							onChange={(value) => {
								console.log(typeof value);
								let x = parseSlateValue([...value]);
								console.log(typeof x);
								setOutput(x.map((n) => serialize(n)).join(""));
							}}
						>
							<Editable
								renderLeaf={renderLeaf}
								placeholder="Enter some text..."
								spellCheck
								autoFocus
								onKeyDown={(event) => {
									for (const hotkey in HOTKEYS) {
										if (isHotkey(hotkey, event)) {
											event.preventDefault();
											const format = HOTKEYS[hotkey];
											toggleMark(editor, format);
										}
									}
								}}
							/>
						</Slate>
					</div>
				</div>

				{/* Output pane */}
				<div
					className="output"
					style={{ width: "40%", display: "flex", flexDirection: "column" }}
					dangerouslySetInnerHTML={{ __html: output }}
				></div>
			</div>
		</div>
	);
}

export default App;
