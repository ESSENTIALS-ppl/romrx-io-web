#!/usr/bin/env python3
"""Generate the ROMRx Base article library (hub + 20 articles) plus
sitemap, RSS feed, llms.txt and the URL inventory.

Static-site friendly: emits plain HTML into /articles using the existing
Electric Cobalt design tokens and shared partials. No runtime build step is
added to the site itself; this script is the reproducible content source.

Run: python3 scripts/build_articles.py
"""
import json
import os
import re
import sys

from content import ARTICLES_LIST, CLUSTERS, DATE, SITE

ARTICLES = {a["slug"]: a for a in ARTICLES_LIST}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(ROOT, "articles")
WORKSPACE = "/home/user/workspace"

ORDER = [slug for _, _, slugs in CLUSTERS for slug in slugs]

DISCLAIMER = (
    "This article is for general education about healthy range of motion and "
    "training. It is not medical advice, does not diagnose or treat any condition, "
    "and does not replace an individual assessment by a qualified clinician. It "
    "makes no guarantee of results and no claim to prevent injury. If you have pain, "
    "swelling, a recent injury, or the red-flag signs described above, see a clinician."
)

AUTHOR_BIO = (
    'Written by <a href="/about">Jim Scott</a>, founder of ROMRx. Jim is a '
    "full-stack developer and long-time Brazilian Jiu-Jitsu practitioner based in "
    "Greenwood, Indiana, who built ROMRx after years of frustration with mobility "
    "apps that ignored his actual range of motion. ROMRx articles are grounded in "
    "peer-reviewed research and reputable medical sources, and are reviewed against "
    "the studies they cite. They are educational and not a substitute for care from "
    "a qualified clinician."
)

FONTS = (
    '<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@700;800;900'
    '&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" '
    'rel="stylesheet">'
)
FAVICON = (
    "<link rel=\"icon\" href=\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'"
    " viewBox='0 0 100 100'><rect fill='%230A1020' width='100' height='100' rx='18'/>"
    "<text x='50' y='68' font-size='52' font-weight='800' font-family='sans-serif'"
    " fill='%233B5BFF' text-anchor='middle'>R</text></svg>\">"
)


def esc(text):
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def strip_tags(html):
    return re.sub(r"<[^>]+>", "", html)


def card_title(slug):
    return ARTICLES[slug]["card"]


def head(title, description, canonical, extra_head="", is_article=True):
    og_type = "article" if is_article else "website"
    parts = [
        "<!DOCTYPE html>",
        '<html lang="en">',
        "<head>",
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        "  <title>%s</title>" % esc(title),
        '  <meta name="description" content="%s">' % esc(description),
        '  <link rel="canonical" href="%s">' % canonical,
        '  <meta name="robots" content="index, follow">',
        '  <meta property="og:type" content="%s">' % og_type,
        '  <meta property="og:site_name" content="ROMRx">',
        '  <meta property="og:title" content="%s">' % esc(title),
        '  <meta property="og:description" content="%s">' % esc(description),
        '  <meta property="og:url" content="%s">' % canonical,
        '  <meta name="twitter:card" content="summary_large_image">',
        '  <meta name="twitter:title" content="%s">' % esc(title),
        '  <meta name="twitter:description" content="%s">' % esc(description),
        '  <link rel="preconnect" href="https://fonts.googleapis.com">',
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        "  " + FONTS,
        "  " + FAVICON,
        '  <link rel="stylesheet" href="/assets/design-tokens.css">',
        '  <link rel="stylesheet" href="/assets/articles.css">',
        '  <script defer src="/assets/partials.js"></script>',
    ]
    if extra_head:
        parts.append(extra_head)
    parts.append("</head>")
    return "\n".join(parts)


def breadcrumb_html(crumbs):
    items = []
    for i, (name, url) in enumerate(crumbs):
        last = i == len(crumbs) - 1
        if last or url is None:
            items.append('    <li><span aria-current="page">%s</span></li>' % esc(name))
        else:
            items.append('    <li><a href="%s">%s</a></li>' % (url, esc(name)))
    return (
        '<nav class="rx-breadcrumb" aria-label="Breadcrumb">\n  <ol>\n'
        + "\n".join(items)
        + "\n  </ol>\n</nav>"
    )


def breadcrumb_jsonld(crumbs):
    elems = []
    for i, (name, url) in enumerate(crumbs):
        item = {"@type": "ListItem", "position": i + 1, "name": name}
        if url:
            item["item"] = url
        elems.append(item)
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": elems,
    }


def article_jsonld(a, canonical):
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": a["h1"],
        "description": a["meta"],
        "articleSection": a["cluster"],
        "inLanguage": "en-US",
        "datePublished": DATE,
        "dateModified": DATE,
        "author": {"@type": "Person", "name": "Jim Scott", "url": SITE + "/about"},
        "publisher": {"@type": "Organization", "name": "ROMRx", "url": SITE + "/"},
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
    }


def faq_jsonld(faq):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": strip_tags(a)},
            }
            for q, a in faq
        ],
    }


def howto_jsonld(howto):
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": howto["name"],
        "step": [
            {"@type": "HowToStep", "name": s["name"], "text": s["text"]}
            for s in howto["steps"]
        ],
    }


def jsonld_block(obj):
    return (
        '<script type="application/ld+json">\n'
        + json.dumps(obj, indent=2)
        + "\n</script>"
    )


def related_html(slugs):
    cards = []
    for s in slugs:
        a = ARTICLES[s]
        cards.append(
            '    <a class="rx-related-card" href="/articles/%s">\n'
            '      <div class="rx-related-kicker">%s</div>\n'
            '      <div class="rx-related-title">%s</div>\n'
            "    </a>" % (s, esc(a["cluster"]), esc(a["card"]))
        )
    return (
        '<section class="rx-related" aria-label="Related articles">\n'
        "  <h2>Keep exploring</h2>\n"
        '  <div class="rx-related-grid">\n'
        + "\n".join(cards)
        + "\n  </div>\n</section>"
    )


def cta_html(a):
    if a.get("cta_bjj"):
        body = (
            "  <p>ROMRx starts with a free Base assessment that measures the range of "
            "motion behind every position you play. Grapplers can then add the "
            '<a href="https://romrx.io/bjj">ROMRx+BJJ</a> pack for guard-specific '
            "readiness scoring, but the Base profile comes first so your hip numbers "
            "drive the plan.</p>\n"
            '  <a class="rx-cta primary" href="https://romrx.io/app/signup">'
            "Start your ROMRx assessment &#8594;</a>"
        )
    else:
        body = (
            "  <p>Stop guessing. A free ROMRx Base assessment measures your active and "
            "passive range, flags your top priority joints, and turns this reading into "
            "a plan you can track over time.</p>\n"
            '  <a class="rx-cta primary" href="https://romrx.io/app/signup">'
            "Create your ROMRx Base profile &#8594;</a>"
        )
    return (
        '<section class="rx-cta-card">\n'
        "  <h2>Measure it, then train it</h2>\n" + body + "\n</section>"
    )


def faq_html(faq):
    items = []
    for q, ans in faq:
        items.append(
            '    <div class="rx-faq-item">\n'
            "      <h3>%s</h3>\n      <p>%s</p>\n    </div>" % (esc(q), ans)
        )
    return (
        '<section class="rx-faq" aria-label="Frequently asked questions">\n'
        + "\n".join(items)
        + "\n</section>"
    )


def render_article(a):
    slug = a["slug"]
    canonical = "%s/articles/%s" % (SITE, slug)
    crumbs = [
        ("Home", SITE + "/"),
        ("Articles", SITE + "/articles"),
        (a["card"], None),
    ]

    body = []
    body.append(head(a["title"], a["meta"], canonical))
    body.append('<body data-rx-here="romrx">')
    body.append('  <div class="rx-ambient"></div>')
    body.append('  <div data-rx-slot="nav"></div>')
    body.append('  <main class="rx-article">')
    body.append('    <div class="rx-container narrow">')
    body.append("      " + breadcrumb_html(crumbs).replace("\n", "\n      "))
    body.append("      <header>")
    body.append('        <p class="rx-eyebrow">%s</p>' % esc(a["cluster"]))
    body.append('        <h1 class="rx-article-h1">%s</h1>' % esc(a["h1"]))
    body.append(
        '        <p class="rx-article-meta">By <a href="/about">Jim Scott</a>, '
        'Founder of ROMRx &middot; Published <time datetime="%s">July 24, 2026</time> '
        '&middot; Updated <time datetime="%s">July 24, 2026</time></p>' % (DATE, DATE)
    )
    body.append("      </header>")
    body.append('      <div class="rx-answer"><p>%s</p></div>' % a["answer"])
    body.append('      <article class="rx-prose">')
    for h2, html in a["sections"]:
        body.append("        <h2>%s</h2>" % esc(h2))
        body.append("        " + html.strip().replace("\n", "\n        "))
    body.append("        <h2>Frequently asked questions</h2>")
    body.append("        " + faq_html(a["faq"]).replace("\n", "\n        "))
    body.append("      </article>")
    body.append("      " + cta_html(a).replace("\n", "\n      "))
    body.append("      " + related_html(a["related"]).replace("\n", "\n      "))
    body.append(
        '      <aside class="rx-disclaimer"><strong>Educational disclaimer.</strong> '
        + DISCLAIMER
        + "</aside>"
    )
    body.append(
        '      <aside class="rx-author"><h2>About the author</h2><p>'
        + AUTHOR_BIO
        + "</p></aside>"
    )
    body.append("    </div>")
    body.append("  </main>")
    body.append('  <div data-rx-slot="universe"></div>')
    body.append('  <div data-rx-slot="legal"></div>')

    body.append("  " + jsonld_block(article_jsonld(a, canonical)))
    body.append("  " + jsonld_block(breadcrumb_jsonld(crumbs)))
    body.append("  " + jsonld_block(faq_jsonld(a["faq"])))
    if a.get("howto"):
        body.append("  " + jsonld_block(howto_jsonld(a["howto"])))
    body.append("</body>")
    body.append("</html>")
    return "\n".join(body) + "\n"


def render_hub():
    canonical = SITE + "/articles"
    crumbs = [("Home", SITE + "/"), ("Articles", None)]
    extra = (
        '  <link rel="alternate" type="application/rss+xml" '
        'title="ROMRx Base Articles" href="/articles/feed.xml">'
    )
    body = []
    body.append(
        head(
            "ROMRx Base Article Library: Range of Motion Guides",
            "Evidence-based guides to range of motion, mobility, flexibility, and "
            "stretching from ROMRx. Learn what your joints can do and how to train it.",
            canonical,
            extra_head=extra,
            is_article=False,
        )
    )
    body.append('<body data-rx-here="romrx">')
    body.append('  <div class="rx-ambient"></div>')
    body.append('  <div data-rx-slot="nav"></div>')
    body.append('  <main>')
    body.append('    <section class="rx-section" style="padding-top: 72px; padding-bottom: 24px;">')
    body.append('      <div class="rx-container narrow rx-center">')
    body.append("        " + breadcrumb_html(crumbs).replace("\n", "\n        "))
    body.append('        <p class="rx-eyebrow rx-mt-md">Article Library</p>')
    body.append(
        '        <h1 class="rx-h1">Understand your<br><span class="rx-grad">'
        "range of motion.</span></h1>"
    )
    body.append(
        '        <p class="rx-lead" style="margin-left:auto;margin-right:auto;">'
        "Plain-language, evidence-based guides to mobility, flexibility, stretching, "
        "and the joints that limit your training. Every guide separates healthy "
        "mobility work from symptoms that need a clinician, and links to the research "
        "behind it.</p>"
    )
    body.append("      </div>")
    body.append("    </section>")

    body.append('    <section class="rx-section" style="padding-top: 24px;">')
    body.append('      <div class="rx-container">')
    for cid, cname, slugs in CLUSTERS:
        body.append('        <section class="rx-cluster" id="%s">' % cid)
        body.append('          <div class="rx-cluster-head">')
        body.append("            <h2>%s</h2>" % esc(cname))
        body.append(
            '            <span class="rx-cluster-count">%d guide%s</span>'
            % (len(slugs), "" if len(slugs) == 1 else "s")
        )
        body.append("          </div>")
        body.append('          <div class="rx-hub-grid">')
        for s in slugs:
            a = ARTICLES[s]
            body.append(
                '            <a class="rx-hub-card" href="/articles/%s">\n'
                '              <span class="rx-hub-kicker">%s</span>\n'
                "              <h3>%s</h3>\n"
                "              <p>%s</p>\n"
                '              <span class="rx-hub-date">Updated Jul 24, 2026</span>\n'
                "            </a>" % (s, esc(a["cluster"]), esc(a["card"]), esc(a["excerpt"]))
            )
        body.append("          </div>")
        body.append("        </section>")
    body.append("      </div>")
    body.append("    </section>")
    body.append("  </main>")
    body.append('  <div data-rx-slot="universe"></div>')
    body.append('  <div data-rx-slot="legal"></div>')

    item_list = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "ROMRx Base Article Library",
        "url": canonical,
        "description": "Evidence-based guides to range of motion, mobility, and flexibility.",
        "hasPart": [
            {
                "@type": "Article",
                "headline": ARTICLES[s]["h1"],
                "url": "%s/articles/%s" % (SITE, s),
            }
            for s in ORDER
        ],
    }
    body.append("  " + jsonld_block(item_list))
    body.append("  " + jsonld_block(breadcrumb_jsonld(crumbs)))
    body.append("</body>")
    body.append("</html>")
    return "\n".join(body) + "\n"


def render_feed():
    items = []
    for s in ORDER:
        a = ARTICLES[s]
        url = "%s/articles/%s" % (SITE, s)
        items.append(
            "    <item>\n"
            "      <title>%s</title>\n"
            "      <link>%s</link>\n"
            "      <guid isPermaLink=\"true\">%s</guid>\n"
            "      <description>%s</description>\n"
            "      <category>%s</category>\n"
            "      <pubDate>Thu, 24 Jul 2026 00:00:00 GMT</pubDate>\n"
            "    </item>" % (esc(a["title"]), url, url, esc(a["meta"]), esc(a["cluster"]))
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        "    <title>ROMRx Base Articles</title>\n"
        "    <link>%s/articles</link>\n" % SITE
        + '    <atom:link href="%s/articles/feed.xml" rel="self" type="application/rss+xml"/>\n' % SITE
        + "    <description>Evidence-based range of motion, mobility, and flexibility "
        "guides from ROMRx.</description>\n"
        "    <language>en-us</language>\n"
        "    <lastBuildDate>Thu, 24 Jul 2026 00:00:00 GMT</lastBuildDate>\n"
        + "\n".join(items)
        + "\n  </channel>\n</rss>\n"
    )


def render_llms():
    lines = [
        "# ROMRx",
        "",
        "> ROMRx builds assessment-first range of motion (ROM) software. ROMRx Base is "
        "a free ROM assessment that identifies your priority joints and turns them into "
        "a trackable mobility plan; sport packs (ROMRx+BJJ, ROMRx+BodyBuilding) stack on "
        "top. The article library below is educational, grounded in peer-reviewed "
        "research and reputable medical sources, and is not medical advice.",
        "",
        "## Product",
        "- [ROMRx Base](%s/): Free range of motion assessment and ROM Readiness Protocol." % SITE,
        "- [Start a free assessment](%s/assessment): Begin the ROMRx Base assessment funnel." % SITE,
        "",
        "## Article library",
        "- [ROMRx Base Article Library](%s/articles): Hub of evidence-based range of "
        "motion, mobility, and flexibility guides." % SITE,
    ]
    for s in ORDER:
        a = ARTICLES[s]
        lines.append("- [%s](%s/articles/%s): %s" % (a["card"], SITE, s, a["llm"]))
    lines.append("")
    return "\n".join(lines)


def render_inventory():
    rows = [
        "# ROMRx Base Article URL Inventory",
        "",
        "Generated for the Base article library. Production URLs are live under "
        "https://romrx.io/articles/. Published and modified: 2026-07-24.",
        "",
        "| # | Title | Slug | Production URL | Primary keyword | Cluster |",
        "| - | ----- | ---- | -------------- | --------------- | ------- |",
    ]
    rows.append(
        "| 0 | ROMRx Base Article Library | (hub) | https://romrx.io/articles | "
        "range of motion articles | Hub |"
    )
    for i, s in enumerate(ORDER, 1):
        a = ARTICLES[s]
        rows.append(
            "| %d | %s | %s | %s/articles/%s | %s | %s |"
            % (i, a["title"], s, SITE, s, a["kw"], a["cluster"])
        )
    rows.append("")
    return "\n".join(rows)


EM_DASH = "—"


def validate(pages):
    errors = []
    titles = {}
    descs = {}
    for slug, a in ARTICLES.items():
        t, m, kw = a["title"], a["meta"], a["kw"].lower()
        if len(t) >= 60:
            errors.append("%s: title >=60 chars (%d)" % (slug, len(t)))
        if not (140 <= len(m) <= 160):
            errors.append("%s: meta len %d not in 140-160" % (slug, len(m)))
        first100 = " ".join(strip_tags(a["answer"]).split()[:100]).lower()
        if kw not in t.lower():
            errors.append("%s: kw not in title" % slug)
        if kw not in a["h1"].lower():
            errors.append("%s: kw not in h1" % slug)
        if kw not in m.lower():
            errors.append("%s: kw not in meta" % slug)
        if kw not in first100:
            errors.append("%s: kw not in first 100 words" % slug)
        if not any(kw in h2.lower() for h2, _ in a["sections"]):
            errors.append("%s: kw not in any H2" % slug)
        titles.setdefault(t, []).append(slug)
        descs.setdefault(m, []).append(slug)
        if not (4 <= len(a["faq"]) <= 6):
            errors.append("%s: faq count %d not 4-6" % (slug, len(a["faq"])))
        if not (3 <= len(a["related"]) <= 6):
            errors.append("%s: related count %d not 3-6" % (slug, len(a["related"])))
        for r in a["related"]:
            if r not in ARTICLES:
                errors.append("%s: related slug missing %s" % (slug, r))
    for t, slugs in titles.items():
        if len(slugs) > 1:
            errors.append("duplicate title: %s -> %s" % (t, slugs))
    for m, slugs in descs.items():
        if len(slugs) > 1:
            errors.append("duplicate meta: %s" % slugs)
    for path, html in pages.items():
        if EM_DASH in html:
            errors.append("EM DASH found in %s" % path)
        # FAQ visible/schema match check for article pages
    return errors


def main():
    os.makedirs(ARTICLES_DIR, exist_ok=True)
    pages = {}
    for slug in ORDER:
        pages[os.path.join(ARTICLES_DIR, slug + ".html")] = render_article(ARTICLES[slug])
    pages[os.path.join(ARTICLES_DIR, "index.html")] = render_hub()

    feed = render_feed()
    llms = render_llms()
    inventory = render_inventory()

    errors = validate(pages)
    # scan aux text outputs for em dash too
    for name, text in [("feed.xml", feed), ("llms.txt", llms), ("inventory", inventory)]:
        if EM_DASH in text:
            errors.append("EM DASH found in %s" % name)

    if len(ORDER) != 20:
        errors.append("expected 20 articles, got %d" % len(ORDER))

    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print("  - " + e)
        sys.exit(1)

    for path, html in pages.items():
        with open(path, "w") as f:
            f.write(html)
    with open(os.path.join(ARTICLES_DIR, "feed.xml"), "w") as f:
        f.write(feed)
    with open(os.path.join(ROOT, "llms.txt"), "w") as f:
        f.write(llms)
    inv_path = os.path.join(ROOT, "articles-inventory.md")
    with open(inv_path, "w") as f:
        f.write(inventory)
    ws_path = os.path.join(WORKSPACE, "romrx-article-url-inventory.md")
    try:
        with open(ws_path, "w") as f:
            f.write(inventory)
    except OSError as exc:
        print("warning: could not write workspace inventory: %s" % exc)

    print("OK: wrote %d articles + hub + feed + llms.txt + inventory" % len(ORDER))
    print("Articles:", ", ".join(ORDER))


if __name__ == "__main__":
    main()
