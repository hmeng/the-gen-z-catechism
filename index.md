---
layout: default
title: The Gen Z Catechism
---

# The Gen Z Catechism

Welcome. This site presents the full “Gen Z Catechism” as 60 short, social-post–style chapters.

Browse the chapters below:

{% assign chapters = site.pages | where_exp: "p", "p.path contains 'chapters/'" | sort: "path" %}
{% if chapters and chapters.size > 0 %}
<ul>
{% for p in chapters %}
  <li><a href="{{ p.url }}">{{ p.title | default: p.name }}</a></li>
{% endfor %}
  </ul>
{% else %}
<p>No chapters found yet.</p>
{% endif %}

