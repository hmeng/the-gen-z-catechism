---
layout: default
title: All Chapters
permalink: /chapters/
---

# All Chapters

{% assign pages_sorted = site.pages | sort: 'path' %}
<ul class="chapters-list">
{% assign count = 0 %}
{% for p in pages_sorted %}
  {% if p.path contains 'chapters/post-' %}
    <li><a href="{{ p.url }}">{{ p.title | default: p.name }}</a></li>
    {% assign count = count | plus: 1 %}
  {% endif %}
{% endfor %}
  </ul>
{% if count == 0 %}
  <p>No chapters found yet.</p>
{% endif %}
