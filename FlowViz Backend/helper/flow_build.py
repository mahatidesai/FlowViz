import json
import re
from typing import Any


def clamp_array(arr: Any, max_items: int) -> list:
    if not isinstance(arr, list):
        return []
    if not isinstance(max_items, (int, float)) or max_items <= 0:
        return []
    return arr[-int(max_items) :]


def _node_label_from_dict(node: dict) -> str:
    data = node.get("data") if isinstance(node.get("data"), dict) else {}
    if isinstance(data.get("label"), str):
        return data["label"]
    if isinstance(node.get("label"), str):
        return node["label"]
    return ""


def diagram_ordered_main_path(
    nodes: list, edges: list, max_hops: int = 80
) -> list[str]:
    """
    Linear order along the main spine (Start → … → End) for LLM context.
    At branches, follows the "Yes" edge when present so the model sees one clear sequence.
    """
    if not isinstance(nodes, list) or not nodes:
        return []
    id_to_label: dict[str, str] = {}
    id_to_node: dict[str, dict] = {}
    for n in nodes:
        if not isinstance(n, dict) or not n.get("id"):
            continue
        nid = str(n["id"])
        id_to_node[nid] = n
        id_to_label[nid] = _node_label_from_dict(n)

    outgoing: dict[str, list[tuple[str, str]]] = {}
    for e in edges or []:
        if not isinstance(e, dict):
            continue
        s, t = e.get("source"), e.get("target")
        if not s or not t:
            continue
        el = e.get("label") if isinstance(e.get("label"), str) else ""
        outgoing.setdefault(str(s), []).append((str(t), el))

    start_id = None
    for nid, n in id_to_node.items():
        if n.get("type") == "input" or normalize_label(
            id_to_label.get(nid, "")
        ) == "start":
            start_id = nid
            break
    if not start_id:
        targets = {
            str(e.get("target"))
            for e in edges or []
            if isinstance(e, dict) and e.get("target")
        }
        roots = [nid for nid in id_to_node if nid not in targets]
        start_id = roots[0] if roots else next(iter(id_to_node), None)
    if not start_id:
        return []

    order: list[str] = []
    seen: set[str] = set()
    cur: str | None = start_id
    hops = 0
    while cur and cur not in seen and hops < max_hops:
        seen.add(cur)
        label = id_to_label.get(cur, "").strip()
        if label:
            order.append(label)
        outs = outgoing.get(cur, [])
        if not outs:
            break
        if len(outs) == 1:
            cur = outs[0][0]
        else:
            yes_tgt = next(
                (t for t, lab in outs if lab and "yes" in lab.lower()),
                None,
            )
            cur = yes_tgt or outs[0][0]
        hops += 1
    return order


def diagram_ordered_no_path(
    nodes: list, edges: list, max_hops: int = 80
) -> list[str]:
    """Sequence when always taking the 'No' edge at each branch (for LLM edit context)."""
    if not isinstance(nodes, list) or not nodes:
        return []
    id_to_label: dict[str, str] = {}
    id_to_node: dict[str, dict] = {}
    for n in nodes:
        if not isinstance(n, dict) or not n.get("id"):
            continue
        nid = str(n["id"])
        id_to_node[nid] = n
        id_to_label[nid] = _node_label_from_dict(n)

    outgoing: dict[str, list[tuple[str, str]]] = {}
    for e in edges or []:
        if not isinstance(e, dict):
            continue
        s, t = e.get("source"), e.get("target")
        if not s or not t:
            continue
        el = e.get("label") if isinstance(e.get("label"), str) else ""
        outgoing.setdefault(str(s), []).append((str(t), el))

    start_id = None
    for nid, n in id_to_node.items():
        if n.get("type") == "input" or normalize_label(
            id_to_label.get(nid, "")
        ) == "start":
            start_id = nid
            break
    if not start_id:
        targets = {
            str(e.get("target"))
            for e in edges or []
            if isinstance(e, dict) and e.get("target")
        }
        roots = [nid for nid in id_to_node if nid not in targets]
        start_id = roots[0] if roots else next(iter(id_to_node), None)
    if not start_id:
        return []

    order: list[str] = []
    seen: set[str] = set()
    cur: str | None = start_id
    hops = 0
    while cur and cur not in seen and hops < max_hops:
        seen.add(cur)
        label = id_to_label.get(cur, "").strip()
        if label:
            order.append(label)
        outs = outgoing.get(cur, [])
        if not outs:
            break
        if len(outs) == 1:
            cur = outs[0][0]
        else:
            no_tgt = next(
                (t for t, lab in outs if lab and "no" in lab.lower()),
                None,
            )
            cur = no_tgt or outs[-1][0]
        hops += 1
    return order


def summarize_diagram(current_diagram: dict | None) -> dict:
    nodes = (
        current_diagram.get("nodes")
        if isinstance(current_diagram, dict)
        else None
    )
    edges = (
        current_diagram.get("edges")
        if isinstance(current_diagram, dict)
        else None
    )
    if not isinstance(nodes, list):
        nodes = []
    if not isinstance(edges, list):
        edges = []

    node_summary = []
    for n in nodes[:60]:
        if not isinstance(n, dict):
            continue
        nid = n.get("id")
        data = n.get("data") if isinstance(n.get("data"), dict) else {}
        label = ""
        if isinstance(data.get("label"), str):
            label = data["label"]
        elif isinstance(n.get("label"), str):
            label = n["label"]
        if nid and label:
            node_summary.append(
                {
                    "id": nid,
                    "type": n.get("type") or "default",
                    "label": label,
                }
            )

    edge_summary = []
    for e in edges[:120]:
        if not isinstance(e, dict):
            continue
        src, tgt = e.get("source"), e.get("target")
        elabel = e.get("label") if isinstance(e.get("label"), str) else ""
        if src and tgt:
            edge_summary.append(
                {"source": src, "target": tgt, "label": elabel}
            )

    ordered = diagram_ordered_main_path(nodes, edges)
    ordered_no = diagram_ordered_no_path(nodes, edges)

    id_to_label: dict[str, str] = {}
    for n in node_summary:
        if isinstance(n, dict) and n.get("id"):
            id_to_label[str(n["id"])] = str(n.get("label", ""))

    labeled_flow: list[str] = []
    for e in edge_summary:
        if not isinstance(e, dict):
            continue
        s = str(e.get("source", ""))
        t = str(e.get("target", ""))
        lab = e.get("label") if isinstance(e.get("label"), str) else ""
        sl = id_to_label.get(s, s)
        tl = id_to_label.get(t, t)
        if sl and tl:
            labeled_flow.append(f"{sl} --[{lab}]--> {tl}")

    return {
        "nodes": node_summary,
        "edges": edge_summary,
        "orderedMainPath": ordered,
        "orderedNoPath": ordered_no,
        "labeledFlow": labeled_flow[:50],
    }


def format_history(history: list | None) -> str:
    turns = clamp_array(history or [], 12)
    lines = []
    for m in turns:
        if not isinstance(m, dict):
            continue
        sender = m.get("sender")
        if sender == "user":
            role = "User"
        elif sender == "server":
            role = "Assistant"
        else:
            role = "Other"
        content = m.get("text") if isinstance(m.get("text"), str) else ""
        content = content.strip()
        if content:
            lines.append(f"{role}: {content}")
    return "\n".join(lines)


def normalize_label(label: str) -> str:
    return re.sub(r"\s+", "", label.lower())


def sanitize_llm_steps(steps: list) -> list:
    """
    Builder already adds Start / End. Strip those (and merge placeholder Continue)
    if the model echoed them, to avoid duplicate or cyclic wiring.
    """
    out: list = []
    for s in steps:
        if not isinstance(s, dict):
            continue
        if s.get("type") == "decision":
            out.append(s)
            continue
        lab = str(s.get("label", "")).strip()
        n = normalize_label(lab)
        if n in ("start", "end", "continue"):
            continue
        out.append(s)
    return out


def _is_retry_branch(label: str) -> bool:
    n = normalize_label(label or "")
    return any(
        k in n
        for k in (
            "retry",
            "tryagain",
            "repeat",
            "reenter",
            "re-enter",
            "loop",
        )
    )


def _step_is_decision(step: dict) -> bool:
    return step.get("type") == "decision"


def build_flow_from_steps(steps: list) -> dict:
    steps = sanitize_llm_steps(steps if isinstance(steps, list) else [])
    nodes: list = []
    edges: list = []
    label_map: dict[str, str] = {}
    node_index = [1]

    def new_id() -> str:
        i = node_index[0]
        node_index[0] = i + 1
        return f"n{i}"

    def create_node(
        label: str, node_type: str = "default", x: int = 0, y_pos: int = 0
    ) -> str:
        if isinstance(label, dict):
            label = label.get("label", str(label))

        label = str(label)
        key = normalize_label(label)
        if key in label_map:
            return label_map[key]
        nid = new_id()
        nodes.append(
            {
                "id": nid,
                "type": node_type,
                "position": {"x": x, "y": y_pos},
                "data": {"label": label},
            }
        )
        label_map[key] = nid
        return nid

    tails_to_end: list[str] = []
    y = 0
    start_id = create_node("Start", "input", 0, y)
    prev_node: str | None = start_id
    y += 180

    i = 0
    while i < len(steps):
        step = steps[i]
        i += 1
        if not isinstance(step, dict):
            continue

        if _step_is_decision(step):
            if prev_node is None:
                m_id = create_node("Continue", "default", 0, y)
                for t in tails_to_end:
                    edges.append(
                        {
                            "id": f"e-{t}-{m_id}",
                            "source": t,
                            "target": m_id,
                            "label": "",
                        }
                    )
                tails_to_end.clear()
                prev_node = m_id
                y += 180
            node_before_decision = prev_node
            dec_label = str(step.get("label", "Decision?")).strip() or "Decision?"
            yes_label = str(step.get("yes", "")).strip() or "Yes"
            no_label = str(step.get("no", "")).strip() or "No"
            no_loop = _is_retry_branch(no_label)

            decision_id = create_node(dec_label, "decision", 0, y)
            edges.append(
                {
                    "id": f"e-{prev_node}-{decision_id}",
                    "source": prev_node,
                    "target": decision_id,
                }
            )

            yes_id = create_node(yes_label, "default", 250, y + 150)
            no_id = create_node(no_label, "default", -250, y + 150)

            edges.append(
                {
                    "id": f"e-{decision_id}-{yes_id}",
                    "source": decision_id,
                    "sourceHandle": "yes",
                    "target": yes_id,
                    "label": "Yes",
                }
            )
            edges.append(
                {
                    "id": f"e-{decision_id}-{no_id}",
                    "source": decision_id,
                    "sourceHandle": "no",
                    "target": no_id,
                    "label": "No",
                }
            )

            next_idx = i
            next_is_process = (
                next_idx < len(steps) and not _step_is_decision(steps[next_idx])
            )

            if next_is_process:
                follow = steps[next_idx]
                i = next_idx + 1
                merge_y = y + 300
                shared_id = create_node(
                    str(follow.get("label", "")), "default", 0, merge_y
                )
                edges.append(
                    {
                        "id": f"e-{yes_id}-{shared_id}",
                        "source": yes_id,
                        "target": shared_id,
                    }
                )
                if no_loop:
                    edges.append(
                        {
                            "id": f"e-{no_id}-{node_before_decision}",
                            "source": no_id,
                            "target": node_before_decision,
                            "label": "Retry",
                        }
                    )
                else:
                    edges.append(
                        {
                            "id": f"e-{no_id}-{shared_id}",
                            "source": no_id,
                            "target": shared_id,
                        }
                    )
                prev_node = shared_id
                y = merge_y + 180
                continue

            tails_to_end.append(yes_id)
            if no_loop:
                edges.append(
                    {
                        "id": f"e-{no_id}-{node_before_decision}",
                        "source": no_id,
                        "target": node_before_decision,
                        "label": "Retry",
                    }
                )
            else:
                tails_to_end.append(no_id)

            prev_node = None
            y += 300
            continue

        if prev_node is None and tails_to_end:
            merge_id = create_node("Continue", "default", 0, y)
            for t in tails_to_end:
                edges.append(
                    {
                        "id": f"e-{t}-{merge_id}",
                        "source": t,
                        "target": merge_id,
                        "label": "",
                    }
                )
            tails_to_end.clear()
            prev_node = merge_id
            y += 180

        if prev_node is None:
            prev_node = start_id

        node_id = create_node(str(step.get("label", "")), "default", 0, y)
        edges.append(
            {
                "id": f"e-{prev_node}-{node_id}",
                "source": prev_node,
                "target": node_id,
                "label": "",
            }
        )
        prev_node = node_id
        y += 180

    has_end = any(
        isinstance(n, dict)
        and isinstance(n.get("data"), dict)
        and normalize_label(str(n["data"].get("label", ""))) == "end"
        for n in nodes
    )
    if not has_end:
        end_id = create_node("End", "default", 0, y)
        for t in tails_to_end:
            edges.append(
                {
                    "id": f"e-{t}-{end_id}",
                    "source": t,
                    "target": end_id,
                    "label": "",
                }
            )
        tails_to_end.clear()
        if prev_node is not None:
            edges.append(
                {
                    "id": f"e-{prev_node}-{end_id}",
                    "source": prev_node,
                    "target": end_id,
                    "label": "",
                }
            )

    return {"nodes": nodes, "edges": edges}


def build_prompt(text: str, history: list | None, current_diagram: dict | None) -> str:
    diagram = summarize_diagram(current_diagram)
    history_text = format_history(history)
    has_diagram = bool(
        diagram.get("nodes") or diagram.get("orderedMainPath")
    )

    edit_hint = ""
    if has_diagram:
        edit_hint = """
        EDIT MODE (existing diagram — read carefully):
        - orderedMainPath follows mostly "Yes" branches; orderedNoPath follows "No" branches.
          Use labeledFlow (source --[edge label]--> target) for exact branch wiring.
        - Preserve every step and decision branch unless the user clearly removes or replaces it.
        - For "before X / after X / between A and B": insert the change at the right place
          relative to those labels (match loosely: "milk" = "Add milk").
        - Do not drop unrelated steps when adding one detail.
        - Output a full replacement "steps" list in final execution order (not a diff).
        """

    return f"""
        {edit_hint}
        Current diagram (JSON). Use orderedMainPath + labeledFlow together for edits:
        {json.dumps(diagram, ensure_ascii=False, default=str)}

        Conversation history (most recent last; may be empty):
        {history_text or "(none)"}

        User instruction:
        {text}
    """

