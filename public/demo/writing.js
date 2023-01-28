"use strict"

async function delay(duration) {
    await new Promise((resolve, _) => {
        setTimeout(() => resolve(), duration * 1000)
    })
}
/**
 * @param base_elem{HTMLElement}
 * @returns {Node | null}
 */
function last_text_node(base_elem) {
    /**
     * @param node{Node}
     * @returns {Node | null}
     */
    const recurse_children = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            let selected = null
            // continue recursion
            Array.from(node.childNodes)
                .reverse()
                .forEach((node) => {
                    let s = recurse_children(node)
                    if (s !== null) {
                        selected = s
                    }
                })
            if (selected !== null) {
                return selected
            }
        }
        return null
    }
    let nodes = base_elem.childNodes
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[nodes.length - i - 1]
        let s = recurse_children(node)
        if (s !== null) {
            return s
        }
    }
    return null
}
/**
 * @param base_elem{HTMLElement}
 * @param index{number}
 * @returns {{node: Node, offset: number}}
 */
function node_from_index(base_elem, index) {
    let curr = 0
    let selected = null
    /**
     * @param node{Node}
     * @returns {void}
     */
    const recurse_children = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (curr + node.textContent.length >= index && selected === null) {
                selected = { node, offset: Math.max(index - curr, 0) }
            }
            curr += node.textContent.length
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            let end_length = 3 + node.tagName.length
            curr += node.outerHTML.length - node.innerHTML.length - end_length
            if (curr + node.innerHTML.length >= index) {
                let curr_before_recurse = curr
                // continue recursion
                node.childNodes.forEach((node) => recurse_children(node))
                if (selected !== null) {
                    return
                }
                curr = curr_before_recurse
            } else {
                // we are too early
            }
            curr += node.innerHTML.length
            curr += end_length
        }
    }
    let nodes = base_elem.childNodes
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        recurse_children(node)
        if (selected !== null) {
            break
        }
    }
    if (selected === null) {
        if (index > curr) {
            let node = last_text_node(base_elem)
            if (node !== null) {
                selected = { node, offset: node.textContent.length }
            }
        }
        if (selected === null) {
            selected = { node: base_elem, offset: 0 }
        }
    }
    return selected
}
/**
 * @param node{Node}
 * @param parent{HTMLElement}
 * @returns {boolean}
 */
function is_descendant(parent, node) {
    let p = node.parentElement
    while (p !== null) {
        if (p === parent) {
            return true
        }
        p = p.parentElement
    }
    return false
}
/**
 * @param sel_node{Node}
 * @param offset{number}
 * @returns {number | null} `null` if `node` isn't a child of `base_elem`
 */
function index_from_node(sel_node, offset) {
    if (is_descendant(base_elem, sel_node)) {
        let curr = 0
        /**
         * @type {number | null}
         */
        let selected = null
        /**
         * @param node{Node}
         * @returns {void}
         */
        const recurse_children = (node) => {
            if (node === sel_node) {
                selected = curr + offset
                return
            } else if (node.nodeType === Node.TEXT_NODE) {
                curr += node.textContent.length
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                let end_length = 3 + node.tagName.length
                curr += node.outerHTML.length - node.innerHTML.length - end_length
                let curr_before_recurse = curr
                // continue recursion
                node.childNodes.forEach((node) => recurse_children(node))
                if (selected !== null) {
                    return
                }
                curr = curr_before_recurse
                curr += node.innerHTML.length
                curr += end_length
            }
        }
        let nodes = base_elem.childNodes
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            recurse_children(node)
            if (selected !== null) {
                break
            }
        }
        return selected
    }
    return null
}
/**
 * @returns {number}
 */
function index_from_sel() {
    let sel = document.getSelection()
    let index = 0
    if (sel.rangeCount !== 0) {
        let r = sel.getRangeAt(0)
        index = index_from_node(r.startContainer, r.startOffset) ?? 0
    }
    return index
}

let base_elem = document.getElementById("input")

/**
 * @type {{[uuid: string]: {e: HTMLElement, index: number}}}
 */
let carets = {}
let caret_container = document.getElementById("caret-container")

/**
 * @param uuid{string}
 * @param index{number}
 * @param color{string} any valid CSS colour
 * @returns {void}
 */
function add_caret(uuid, index, color) {
    let caret = document.createElement("span")
    caret.classList.add("caret")
    caret.style.backgroundColor = color
    caret.id = `caret-${uuid}`
    update_caret_position(caret, index)
    caret_container.appendChild(caret)

    carets[uuid] = { e: caret, index }
}
/**
 * @param caret{HTMLElement}
 * @param index{number}
 */
function update_caret_position(caret, index) {
    let pos = caret_position(index)
    caret.style.top = `${pos.top + pos.height * 0.1}px`
    caret.style.left = `${pos.left}px`
    caret.style.height = `${pos.height * 0.8}px`
    caret.style.width = `${pos.height * 0.14}px`
}
function update_all_carets() {
    for (const uuid in carets) {
        const caret = carets[uuid]
        update_caret_position(caret.e, caret.index)
    }
}
let changed = false
base_elem.addEventListener("input", () => {
    changed = true
    update_all_carets()
})
window.addEventListener("resize", () => {
    update_all_carets()
})

/**
 * @param index{number}
 * @returns {DOMRect}
 */
function caret_position(index) {
    let { node, offset } = node_from_index(base_elem, index)
    let range = document.createRange()
    range.setStart(node, offset)
    return range.getBoundingClientRect()
}

const replaceTag = (tag) => {
    changed = true
    let sel = document.getSelection()
    if (sel.rangeCount === 0) {
        return
    }
    let range = sel.getRangeAt(0)
    let node = document.getSelection().getRangeAt(0).startContainer
    let offset = range.startOffset

    let newElem = document.createElement(tag)
    let oldParent = node.parentElement
    if (oldParent === null || node.id === "input") {
        return
    }
    let prevOldParent = node
    while (oldParent.tagName !== "DIV") {
        prevOldParent = oldParent
        oldParent = oldParent.parentElement
    }
    if (oldParent.id === "input") {
        oldParent = prevOldParent
    }
    let children = Array.from(oldParent.childNodes)
    let append = null
    // is text node
    if (oldParent.nodeType === 3) {
        children = [oldParent]
        append = oldParent.parentElement
    }
    children.forEach((child) => newElem.appendChild(child))
    if (append !== null) {
        append.appendChild(newElem)
    } else {
        oldParent.parentElement.replaceChild(newElem, oldParent)
    }

    sel = document.getSelection()
    let r = sel.getRangeAt(0)
    r.setStart(children[0], offset)
    update_all_carets()
}
document.querySelectorAll("#buttons button[data-heading]").forEach((elem) => {
    let heading = elem.getAttribute("data-heading")
    elem.addEventListener("click", () => {
        replaceTag(heading)
    })
})
document.querySelectorAll("#buttons button[data-exec]").forEach((elem) => {
    let exec = elem.getAttribute("data-exec")
    elem.addEventListener("click", () => {
        document.execCommand(exec)
    })
})

document.addEventListener("keydown", (e) => {
    if (e.key === "b" && e.ctrlKey) {
        document.execCommand("bold")
        e.preventDefault()
    }
    if (e.key === "i" && e.ctrlKey) {
        document.execCommand("italic")
        e.preventDefault()
    }
    if (e.key === "u" && e.ctrlKey) {
        document.execCommand("underline")
        e.preventDefault()
    }
    if (e.key === "1" && e.ctrlKey && e.altKey) {
        replaceTag("h1")
        e.preventDefault()
    }
    if (e.key === "2" && e.ctrlKey && e.altKey) {
        replaceTag("h2")
        e.preventDefault()
    }
    if (e.key === "3" && e.ctrlKey && e.altKey) {
        replaceTag("h3")
        e.preventDefault()
    }
    if (e.key === "0" && e.ctrlKey && e.altKey) {
        replaceTag("div")
        e.preventDefault()
    }
})

//=============
// Agde worker
//=============

let worker = new Worker("worker.js")

let uuid = null

/**
 * @param url{string}
 * @param log_level{string|undefined}
 */
function init(url, log_level) {
    worker.postMessage({ action: "init", url, log_level })
}
const lf = localforage.createInstance({ name: "agde" })
/**
 * @param document{string}
 * @returns {Promise<Uint8Array | null>}
 */
async function get_document(document) {
    let doc = await lf.getItem(`current/${document}`)
    return doc?.data ?? new Uint8Array()
}
/**
 * @param document {string}
 * @param data {Uint8Array}
 */
async function put_document(document, data) {
    await lf.setItem(`current/${document}`, {
        data,
        compression: "none",
        size: data.length,
        mtime: new Date() / 1000,
    })
}
async function commit_and_send() {
    let te = new TextEncoder()
    if (changed) {
        await put_document("default", te.encode(base_elem.innerHTML.trim()))
    }
    let sel = document.getSelection()
    let idx = []
    if (sel.rangeCount !== 0) {
        let r = sel.getRangeAt(0)
        let c1 = index_from_node(r.startContainer, r.startOffset)
        let c2 = index_from_node(r.endContainer, r.endOffset)
        if (c1 !== null && c2 !== null) {
            idx = [c1, c2]
        }
    }
    worker.postMessage({
        action: "commit",
        cursors: idx.map((idx) => {
            return { resource: "default", index: idx }
        }),
    })
    let cursors = await new Promise((resolve, _reject) => {
        let listener = (msg) => {
            if (msg.data.committed === true) {
                resolve(msg.data.cursors)
                worker.removeEventListener("message", listener)
            }
        }
        worker.addEventListener("message", listener)
    })
    let d = await get_document("default")
    let td = new TextDecoder()
    let t = td.decode(d)
    // don't replace when unnecessary
    if (base_elem.innerHTML.trim() !== t.trim()) {
        let sel = document.getSelection()
        let new_idx = idx
        if (sel.rangeCount !== 0) {
            let r = sel.getRangeAt(0)
            // get selection before HTML override
            new_idx = [index_from_node(r.startContainer, r.startOffset), index_from_node(r.endContainer, r.endOffset)]
        }

        base_elem.innerHTML = t.trim()

        if (new_idx[0] !== undefined && new_idx[1] !== undefined) {
            let c1, c2
            if (idx[0] === undefined || idx[1] === undefined) {
                c1 = new_idx[0]
                c2 = new_idx[1]
            } else {
                let o1 = new_idx[0] - idx[0]
                let o2 = new_idx[1] - idx[1]
                // cursors will always be populated if idx is,
                // because agde returns the same number of cursors, hopefully in the same order...
                c1 = (o1 ?? 0) + cursors[0].index
                c2 = (o2 ?? 0) + cursors[1].index
            }

            let n1 = node_from_index(base_elem, c1)
            let n2 = node_from_index(base_elem, c2)
            sel.removeAllRanges()
            let r = document.createRange()
            r.setStart(n1.node, n1.offset)
            r.setEnd(n2.node, n2.offset)
            sel.addRange(r)
        }

        update_all_carets()
    }
}
function shutdown() {
    worker.postMessage({ action: "shutdown" })
}
/**
 * @param s{string}
 */
function send(s) {
    let te = new TextEncoder()
    let data = te.encode(s)
    worker.postMessage({ action: "send", data }, [data.buffer])
}

//======
// Init
//======

let disconnected = false
let manual = false

let manual_button = document.getElementById("manual")

worker.addEventListener("message", (msg) => {
    if (msg.data.uuid !== undefined) {
        if (msg.data.uuid === null) {
            console.warn("Tried to get the UUID after disconnection.")
        } else {
            uuid = msg.data.uuid
            commit_and_send()
        }
    }
    if (msg.data.action === "user_data") {
        let d = msg.data.user_data
        let td = new TextDecoder()
        d = td.decode(d)
        if (d.startsWith("c ")) {
            let arr = d.substring(2).split(" ")
            let [pier, command] = arr
            let arg = arr.slice(2).join(" ")
            let index = +command
            if (isFinite(index)) {
                let caret = carets[pier]
                if (caret !== undefined) {
                    caret.index = index
                    update_caret_position(caret.e, index)
                } else {
                    add_caret(pier, index, arg)
                }
            } else if (command === "disconnect") {
                let caret = carets[pier]
                if (caret !== undefined) {
                    caret.e.remove()
                }
                delete carets[pier]
            }
        }
    }
    if (msg.data.action === "pier_disconnect") {
        let pier = msg.data.pier
        let caret = carets[pier]
        if (caret !== undefined) {
            caret.e.remove()
        }
        delete carets[pier]
    }
    if (msg.data.action === "disconnect") {
        disconnected = true
    }
})
let ws_url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/demo/ws`
init(ws_url, localStorage.getItem("agde-log-level") ?? "warn")
;(async () => {
    let td = new TextDecoder()
    let doc = await get_document("default")
    if (doc !== null) {
        base_elem.innerHTML = td.decode(doc).trim()
    }
})()

setTimeout(async () => {
    worker.postMessage({ action: "uuid" })
    while (uuid === null) {
        await delay(0.5)
    }
    let index = index_from_sel()
    let colour = `hsl(${Math.round(Math.random() * 360)}deg 70% 70%)`
    send(`c ${uuid} ${index} ${colour}`)
    const send_pos = () => {
        let new_index = index_from_sel()
        if (new_index !== null) {
            if (new_index === index) {
                return
            }
            index = new_index
            send(`c ${uuid} ${index} ${colour}`)
        }
    }

    let last_changed = false
    while (true) {
        await delay(2)
        if (disconnected || manual) {
            break
        }
        if (changed && !last_changed) {
            await commit_and_send()
            changed = false
            last_changed = true
            send_pos()
            continue
        }
        last_changed = false
        if (changed) {
            continue
        }
        await commit_and_send()
        changed = false
        send_pos()
    }
}, 2000)
manual_button.addEventListener("click", async () => {
    if (!manual) {
        manual = true
        manual_button.innerText = "Send changes"
    } else {
        manual_button.disabled = true
        await commit_and_send()
        manual_button.disabled = false
    }
})
document.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
        if (manual) {
            e.preventDefault()
            manual_button.disabled = true
            await commit_and_send()
            manual_button.disabled = false
        }
    }
})

window.addEventListener("beforeunload", (_) => {
    worker.postMessage({ action: "shutdown" })
    if (uuid !== null) {
        send(`c ${uuid} disconnect`)
    }
})

document.getElementById("logout").addEventListener("click", async () => {
    await fetch("/demo/auth", { method: "DELETE" })
    location.reload()
})
