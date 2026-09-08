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

from content import ARTICLES_LIST, CLUSTERS, DATE, SITE, XREF

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
    "Dublin, Ohio, who built ROMRx after years of frustration with mobility "
    "apps that ignored his actual range of motion. ROMRx articles are grounded in "
    "peer-reviewed research and reputable medical sources, and are reviewed against "
    "the studies they cite. They are educational and not a substitute for care from "
    "a qualified clinician."
)
