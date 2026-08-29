import unittest

from harvest_templetherapy import parse_public_page
from curate_templetherapy import select_maya_aztec_records


SAMPLE_PAGE = '''
<link rel="prev" href="/s/TempleTherapy?before=60">
<div class="tgme_widget_message" data-post="TempleTherapy/73">
  <div class="tgme_widget_message_user"><img src="https://cdn.example/avatar.jpg"></div>
  <div class="tgme_widget_message_text js-message_text" dir="auto">НАСТРОЙКА.<br/>Бог Ветра. Эхекатль.<br/><br/>Строка первая<br/>Строка вторая</div>
  <a class="tgme_widget_message_date" href="https://t.me/TempleTherapy/73"><time datetime="2021-03-19T00:29:55+00:00">00:29</time></a>
  <a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn.example/ehecatl.jpg')"></a>
</div>
'''


class TempleTherapyPublicPageTests(unittest.TestCase):
    def test_extracts_source_text_date_media_and_next_older_page(self):
        posts, older_before = parse_public_page(SAMPLE_PAGE)

        self.assertEqual(older_before, 60)
        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0]["post_id"], 73)
        self.assertEqual(posts[0]["date"], "2021-03-19T00:29:55+00:00")
        self.assertEqual(posts[0]["raw_text"], "НАСТРОЙКА.\nБог Ветра. Эхекатль.\n\nСтрока первая\nСтрока вторая")
        self.assertEqual(posts[0]["media_references"], ["https://cdn.example/ehecatl.jpg"])

    def test_selects_ehecatl_setting_for_the_reader(self):
        selected = select_maya_aztec_records([{
            "channel": "TempleTherapy", "post_id": 73, "url": "https://t.me/TempleTherapy/73",
            "date": "2021-03-19T00:29:55+00:00",
            "raw_text": "НАСТРОЙКА. Бог Ветра. Эхекатль.\nСтрофа настройки.",
            "media_references": [],
        }])

        self.assertEqual(len(selected), 1)
        self.assertTrue(selected[0]["reader_include"])
        self.assertEqual(selected[0]["chapter"], "I. Описание традиции")
