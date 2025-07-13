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

function parseTagsAndCleanChildren(children) {
	// Flatten all text
	let offsets = [];
	let fullText = "";
	children.forEach((child) => {
		offsets.push(fullText.length);
		fullText += child.text || "";
	});

	// Parse all tags from the full text
	const tagRegex = /\[(\w+):([^\]]+)\]/g;
	const tags = {};
	let match;
	let indicesToRemove = [];
	while ((match = tagRegex.exec(fullText)) !== null) {
		tags[match[1]] = match[2];
		indicesToRemove.push([match.index, match.index + match[0].length]);
	}

	// Build clean text, skipping tag ranges
	let cleanText = "";
	let lastIndex = 0;
	for (const [start, end] of indicesToRemove) {
		cleanText += fullText.slice(lastIndex, start);
		lastIndex = end;
	}
	cleanText += fullText.slice(lastIndex);

	// If you want to preserve formatting, this gets tricky.
	// But for WhatsApp-style chats, most messages don't have tags in the middle of formatting.
	// So you can just replace the children with a single child with the clean text:
	return {
		tags,
		cleanChildren: [{ text: cleanText.trim() }],
	};
}

function getValidTimeOrNow(timeString) {
	const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
	if (hhmmRegex.test(timeString)) {
		return timeString;
	}
	// Return current time as HH:MM
	const now = new Date();
	const hh = String(now.getHours()).padStart(2, "0");
	const mm = String(now.getMinutes()).padStart(2, "0");
	return `${hh}:${mm}`;
}

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

		// First pass: assign sender, id, tags, clean children
		for (let i = 0; i < clone.length; i++) {
			let node = clone[i];
			if (
				node.children[0].text.startsWith(">") ||
				node.children[0].text.startsWith("<")
			) {
				node.sender = node.children[0].text.startsWith(">") ? 0 : 1;
				node.children[0].text = node.children[0].text.replace(/^[><]/, "").trim();
				const { tags, cleanChildren } = parseTagsAndCleanChildren(node.children);
				node.tags = tags; // Keep tags for next pass
				node.children = cleanChildren;
				if (tags.id) node.id = tags.id;
				node.time = getValidTimeOrNow(tags.time);
			} else if (node.children[0].text.startsWith("::date")) {
				node.children[0].text = node.children[0].text.replace("::date", "").trim();
				node.type = "date-divider";
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

		// Second pass: build id map for replies
		const idMap = {};
		for (const node of clone) {
			if (node.id) idMap[node.id] = node;
		}

		// Third pass: resolve reply texts
		for (const node of clone) {
			const tags = node.tags || {};
			if (tags.reply && idMap[tags.reply]) {
				node.replyNode = idMap[tags.reply]; // Attach the node being replied to
				node.type = "reply";
			}
			// Clean up temporary tag property
			delete node.tags;
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
		const timeHtml = node.time
			? `<span class="msg-time">${escapeHtml(node.time)}</span>`
			: "";

		switch (node.type) {
			case "quote":
				return `<blockquote><p>${children}</p></blockquote>`;
			case "reply":
				let replyText = node.replyNode
					? node.replyNode.children.map((n) => serialize(n)).join("")
					: "";
				return `<div style="align-self:${
					node.sender == 0 ? "flex-end" : "flex-start"
				}" class="message_container ${
					node.sender == 0 ? "outgoing_msg" : "incoming_msg"
				}">
					<div class="reply-preview">${replyText}</div>
					<p>${children} ${timeHtml}</p>
				</div>`;
			case "paragraph":
				return `<div style="align-self:${
					node.sender == 0 ? "flex-end" : "flex-start"
				}" class="message_container ${
					node.sender == 0 ? "outgoing_msg" : "incoming_msg"
				}"><p>${children} ${timeHtml}</p></div>`;
			case "link":
				return `<a href="${escapeHtml(node.url)}">${children}</a>`;
			case "date-divider":
				return `<div class="date-divider"><p>${children}</p></div>`;
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
								let x = parseSlateValue([...value]);
								console.log(x);
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
