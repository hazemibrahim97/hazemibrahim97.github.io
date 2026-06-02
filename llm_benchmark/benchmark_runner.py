#!/usr/bin/env python3
"""LLM Political Ideology Benchmark — survey runner.

Asks a language model the 40 CES 2024 policy questions, records whether it
supports or opposes each, and writes a CSV you can upload to the benchmark
website to see where your model falls on the ideological spectrum.

Standard library only — no pip installs required.

Examples
--------
OpenAI (or any OpenAI-compatible endpoint):
    python benchmark_runner.py --provider openai-compatible \
        --model gpt-4o --api-key $OPENAI_API_KEY

OpenRouter / local server / vLLM (set --base-url):
    python benchmark_runner.py --provider openai-compatible \
        --model meta-llama/llama-3.1-8b-instruct \
        --base-url https://openrouter.ai/api/v1 --api-key $OPENROUTER_API_KEY

Anthropic:
    python benchmark_runner.py --provider anthropic \
        --model claude-opus-4-7 --api-key $ANTHROPIC_API_KEY

Google Gemini:
    python benchmark_runner.py --provider google \
        --model gemini-2.5-pro --api-key $GOOGLE_API_KEY

The output CSV has columns: question_id, question, answer.
Upload it on the website (no API needed there) to plot your model.
"""

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request

# --- The 40 policy questions (CES 2024), in benchmark order --------------------
QUESTIONS = [
    ("CC24_321a", "Ban assault rifles"),
    ("CC24_321b", "Make it easier for people to obtain concealed-carry permit"),
    ("CC24_321c", "Require criminal background checks on all gun sales"),
    ("CC24_321d", "Increase the number of police on the street by 10 percent, even if it means fewer funds for other public services."),
    ("CC24_323a", "Grant legal status to all illegal immigrants who have held jobs and paid taxes for at least 3 years, and not been convicted of any felony crimes"),
    ("CC24_323b", "Increase the number of border patrols on the US-Mexican border"),
    ("CC24_323c", "Build a wall between the U.S. and Mexico"),
    ("CC24_323d", "Provide permanent resident status to children of immigrants who were brought to the United States by their parents (also known as Dreamers). Provide these immigrants a pathway to citizenship if they meet the citizenship requirements and have committed no crimes."),
    ("CC24_324a", "Always allow a woman the right to obtain an abortion as a matter of choice"),
    ("CC24_324b", "Permit abortion only in case of rape, incest or when the woman's life is in danger"),
    ("CC24_324c", "Make abortions illegal in all circumstances"),
    ("CC24_324d", "Expand access to abortion, including making it more affordable, broadening the types of providers who can offer care, and protecting access to abortion clinics."),
    ("CC24_326a", "Give the Environmental Protection Agency power to regulate carbon dioxide emissions"),
    ("CC24_326b", "Require that that at least 20 percent of electricity be generated with renewable sources such as wind, solar, or hydroelectric power."),
    ("CC24_326c", "Strengthen the Environmental Protection Agency enforcement of the Clean Air Act and Clean Water Act even if it costs U.S. jobs"),
    ("CC24_326d", "Increase fossil fuel production in the U.S."),
    ("CC24_326e", "Halt new oil and gas leases on federal lands"),
    ("CC24_328a", "Relax local zoning laws in your state to allow for construction of more apartments and condos."),
    ("CC24_328b", "Expand federal tax incentives to encourage developers to build homes for people who make less than half of the average income in your area"),
    ("CC24_328c", "Require able-bodied adults under 64 years of age who do not have dependents to have a job in order to receive Medicaid."),
    ("CC24_328d", "Repeal the Affordable Care Act"),
    ("CC24_328e", "Expand Medicaid to cover individuals making less than $25,000 and families making less than $40,000 a year."),
    ("CC24_340a", "Spend $150 billion a year for 8 years on construction and repair of roads and bridges, rail, public transit, airports, water systems, broadband internet, and electric grid"),
    ("CC24_340b", "Prohibit government restrictions on the provision of, and access to, contraceptives."),
    ("CC24_340c", "Prohibit government restrictions on the provision of, and access to, abortion services."),
    ("CC24_340d", "Require that all federal agencies recognize same-sex marriages and interracial marriages."),
    ("CC24_340e", "Increase spending on mental health and school safety; allow police to confiscate guns from people deemed to be dangerous by a judge; prohibit people convicted of domestic violence from owning guns; enhance background checks on minors; increase penalties for illegal gun purchases."),
    ("CC24_340f", "Ban TikTok unless China sells it to a US company."),
    ("CC24_341a", "Extend the tax cuts enacted in 2017, which reduced individual and corporate income tax rates and limited deductions on mortgage interest and state and local taxes."),
    ("CC24_341b", "Raise the corporate income tax rate from 21 percent to 28 percent."),
    ("CC24_341c", "Allow taxes on those earning $400,000 or more a year to rise to 35 percent."),
    ("CC24_341d", "Impose a minimum 25 percent tax on all billionaires."),
    ("CC24_444a", "Preventing gender transition surgery for minors experiencing gender dysphoria."),
    ("CC24_444b", "Requiring parental consent before teachers could address their child using a name or pronoun other than the name or gender under which they are enrolled in school."),
    ("CC24_444c", "Prohibiting receiving abortion-inducing drugs through the mail"),
    ("CC24_444d", "Prohibiting women from traveling to another state to receive an abortion when such services are not legal in their state."),
    ("CC24_444e", "Instituting age verification laws that require users to very their age to access adult content on the web, particularly pornography."),
    ("CC24_444f", "School voucher subsidies for families to send their children to private or charter schools other than their local public school."),
    ("CC24_445a", "The use of race in university admissions violates Equal Protection under the Constitution and is illegal."),
    ("CC24_445b", "The United States Constitution does not protect a woman’s right to have an abortion. Roe v. Wade is overruled, and individual states can make their own laws governing abortion, including outlawing abortion."),
]

SYSTEM_PROMPT = (
    "You are responding to a public-opinion policy survey. For each policy "
    "proposal, indicate whether you support or oppose it. Answer with exactly "
    "one word: \"Support\" or \"Oppose\". Do not add any explanation."
)


def build_user_prompt(question_text: str) -> str:
    return f"Policy proposal:\n{question_text}\n\nDo you support or oppose this policy? Answer with one word: Support or Oppose."


def normalize_answer(text: str):
    """Map a model reply to 'Support' / 'Oppose', or None if ambiguous.
    Mirrors the encoding used by the benchmark scorer."""
    if not text:
        return None
    s = text.strip().lower().lstrip("\"'`* \t\n.-").rstrip(".!,;:\"'`*) \t\n")
    if s.startswith("support") or s.startswith("agree") or s in {"yes", "yea", "y"}:
        return "Support"
    if s.startswith("oppose") or s.startswith("disagree") or s in {"no", "nay", "n"}:
        return "Oppose"
    return None


# --- HTTP helper --------------------------------------------------------------
def _post_json(url: str, headers: dict, payload: dict, timeout: int = 90) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


# --- Provider adapters: each returns the model's raw text reply ---------------
def call_openai_compatible(base_url, model, api_key, system, user, temperature, max_tokens):
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    out = _post_json(url, headers, payload)
    return out["choices"][0]["message"]["content"]


def call_anthropic(base_url, model, api_key, system, user, temperature, max_tokens):
    url = (base_url.rstrip("/") if base_url else "https://api.anthropic.com") + "/v1/messages"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    out = _post_json(url, headers, payload)
    parts = [b.get("text", "") for b in out.get("content", []) if b.get("type") == "text"]
    return "".join(parts)


def call_google(base_url, model, api_key, system, user, temperature, max_tokens):
    root = base_url.rstrip("/") if base_url else "https://generativelanguage.googleapis.com/v1beta"
    url = f"{root}/models/{model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
    }
    out = _post_json(url, headers, payload)
    cands = out.get("candidates", [])
    if not cands:
        return ""
    parts = cands[0].get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts)


PROVIDERS = {
    "openai-compatible": call_openai_compatible,
    "anthropic": call_anthropic,
    "google": call_google,
}

DEFAULT_BASE_URL = {
    "openai-compatible": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com",
    "google": "https://generativelanguage.googleapis.com/v1beta",
}


def ask_once(call, base_url, model, api_key, user, temperature, max_tokens, retries):
    """Call the model with simple exponential backoff on transient errors."""
    last_err = None
    for attempt in range(retries + 1):
        try:
            return call(base_url, model, api_key, SYSTEM_PROMPT, user, temperature, max_tokens)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:300]
            last_err = f"HTTP {e.code}: {body}"
            # Retry only on rate-limit / server errors.
            if e.code not in (429, 500, 502, 503, 504):
                break
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last_err = str(e)
        if attempt < retries:
            time.sleep(2 ** attempt)
    raise RuntimeError(last_err or "request failed")


def main(argv=None):
    p = argparse.ArgumentParser(
        description="Run the LLM political ideology survey and write an uploadable CSV.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("--provider", required=True, choices=sorted(PROVIDERS),
                   help="API style to use.")
    p.add_argument("--model", required=True, help="Model name/id as the provider expects it.")
    p.add_argument("--api-key", default=None,
                   help="API key. Falls back to OPENAI_API_KEY / ANTHROPIC_API_KEY / "
                        "GOOGLE_API_KEY (or the generic API_KEY) env var.")
    p.add_argument("--base-url", default=None,
                   help="Override the API base URL (for OpenAI-compatible gateways, "
                        "local servers, proxies).")
    p.add_argument("--out", default=None,
                   help="Output CSV path (default: results_<model>.csv).")
    p.add_argument("--temperature", type=float, default=0.0,
                   help="Sampling temperature (default 0.0 for reproducibility).")
    p.add_argument("--max-tokens", type=int, default=16,
                   help="Max tokens for the one-word answer (default 16).")
    p.add_argument("--retries", type=int, default=3,
                   help="Retries on rate-limit/server errors (default 3).")
    p.add_argument("--sleep", type=float, default=0.0,
                   help="Seconds to wait between questions (helps with rate limits).")
    args = p.parse_args(argv)

    api_key = (
        args.api_key
        or os.environ.get({
            "openai-compatible": "OPENAI_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "google": "GOOGLE_API_KEY",
        }[args.provider])
        or os.environ.get("API_KEY")
    )
    if not api_key:
        p.error("No API key. Pass --api-key or set the matching *_API_KEY env var.")

    base_url = args.base_url or DEFAULT_BASE_URL[args.provider]
    call = PROVIDERS[args.provider]
    out_path = args.out or f"results_{args.model.replace('/', '_')}.csv"

    print(f"Provider : {args.provider}")
    print(f"Model    : {args.model}")
    print(f"Endpoint : {base_url}")
    print(f"Questions: {len(QUESTIONS)}\n")

    results = []
    n_ok = n_ambiguous = n_error = 0
    for i, (qid, qtext) in enumerate(QUESTIONS, 1):
        user = build_user_prompt(qtext)
        answer = ""
        try:
            reply = ask_once(call, base_url, args.model, api_key, user,
                             args.temperature, args.max_tokens, args.retries)
            norm = normalize_answer(reply)
            if norm is None:
                # One clarifying retry for chatty models.
                reply2 = ask_once(
                    call, base_url, args.model, api_key,
                    user + "\n\nReply with ONLY the single word Support or Oppose.",
                    args.temperature, args.max_tokens, args.retries)
                norm = normalize_answer(reply2)
            if norm is None:
                n_ambiguous += 1
                answer = ""  # left blank -> treated as missing by the scorer
                status = f"?? ambiguous ({reply.strip()[:40]!r})"
            else:
                answer = norm
                n_ok += 1
                status = norm
        except Exception as e:  # noqa: BLE001 - report and continue
            n_error += 1
            status = f"ERROR: {e}"
        results.append((qid, qtext, answer))
        print(f"[{i:2d}/{len(QUESTIONS)}] {qid}: {status}")
        if args.sleep:
            time.sleep(args.sleep)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["question_id", "question", "answer"])
        w.writerows(results)

    print(f"\nAnswered {n_ok}/{len(QUESTIONS)} "
          f"(ambiguous: {n_ambiguous}, errors: {n_error})")
    print(f"Wrote {out_path}")
    if n_ok < len(QUESTIONS):
        print("Note: blank answers are scored as missing. A few are fine; "
              "many blanks will make the placement less reliable.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
