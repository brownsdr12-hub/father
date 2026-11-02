# -*- coding: utf-8 -*-
"""Сборка презентации для руководства."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ── Фирменная палитра (та же, что в приложении) ──────────────
NIGHT   = RGBColor(0x12, 0x13, 0x1C)
NIGHT2  = RGBColor(0x23, 0x26, 0x3A)
AURORA  = RGBColor(0x6E, 0x5B, 0xD6)
AURORA_L= RGBColor(0xE9, 0xE5, 0xFB)
MINT    = RGBColor(0x4F, 0xBF, 0xA8)
PAPER   = RGBColor(0xFB, 0xFA, 0xFF)
WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
TEXT    = RGBColor(0x17, 0x18, 0x2A)
TEXT6   = RGBColor(0x4E, 0x50, 0x69)
TEXT4   = RGBColor(0x8B, 0x8D, 0xA6)
LINE    = RGBColor(0xE6, 0xE4, 0xF0)
RED     = RGBColor(0xC0, 0x4B, 0x4B)
AMBER   = RGBColor(0xB8, 0x86, 0x2A)

W, H = Inches(13.333), Inches(7.5)
prs = Presentation()
prs.slide_width, prs.slide_height = W, H
BLANK = prs.slide_layouts[6]


def slide(bg=WHITE):
    s = prs.slides.add_slide(BLANK)
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    r.fill.solid(); r.fill.fore_color.rgb = bg
    r.line.fill.background(); r.shadow.inherit = False
    return s


def text(s, x, y, w, h, runs, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, space=1.0):
    """runs: список (текст, размер, цвет, жирность, [отступ сверху])"""
    tb = s.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    first = True
    for item in runs:
        t, size, color, bold = item[0], item[1], item[2], item[3]
        gap = item[4] if len(item) > 4 else 0
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = align
        p.line_spacing = space
        if gap:
            p.space_before = Pt(gap)
        r = p.add_run(); r.text = t
        r.font.size = Pt(size); r.font.color.rgb = color; r.font.bold = bold
    return tb


def notes(s, txt):
    s.notes_slide.notes_text_frame.text = txt


def footer(s, n):
    text(s, Inches(0.6), Inches(6.95), Inches(9), Inches(0.35),
         [("Свой круг · внутренняя презентация", 9, TEXT4, False)])
    text(s, Inches(11.9), Inches(6.95), Inches(0.9), Inches(0.35),
         [(str(n), 9, TEXT4, False)], align=PP_ALIGN.RIGHT)


def head(s, title, sub=None, n=None):
    text(s, Inches(0.7), Inches(0.5), Inches(11.9), Inches(0.9),
         [(title, 30, TEXT, True)])
    if sub:
        text(s, Inches(0.7), Inches(1.35), Inches(11.9), Inches(0.5),
             [(sub, 14, TEXT6, False)])
    if n is not None:
        footer(s, n)


# ══════════════════════════════════════════════════════════════
# 1. Титул
# ══════════════════════════════════════════════════════════════
s = slide(NIGHT)
bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(4.5), W, Inches(3.0))
bar.fill.solid(); bar.fill.fore_color.rgb = NIGHT2
bar.line.fill.background(); bar.shadow.inherit = False

text(s, Inches(1.0), Inches(1.5), Inches(11), Inches(0.5),
     [("ВНУТРЕННЯЯ ПРЕЗЕНТАЦИЯ", 12, RGBColor(0x8B,0x7B,0xEA), True)])
text(s, Inches(1.0), Inches(2.1), Inches(11), Inches(1.4),
     [("Почему мы теряем деньги", 44, WHITE, True),
      ("при 969 000 охвата в неделю", 44, WHITE, True)], space=0.95)
text(s, Inches(1.0), Inches(4.9), Inches(11), Inches(1.0),
     [("Разбор воронки и решение, которое закрывает потери", 18, RGBColor(0xB8,0xB2,0xD8), False)])
text(s, Inches(1.0), Inches(5.7), Inches(11), Inches(0.5),
     [("По данным недели 21–27 сентября 2026", 12, RGBColor(0x7A,0x7C,0x99), False)])
notes(s, "Главная мысль: проблема не в трафике. Трафик работает отлично. "
         "Деньги теряются на последнем шаге — между интересом и оплатой.")

# ══════════════════════════════════════════════════════════════
# 2. Факт
# ══════════════════════════════════════════════════════════════
s = slide()
head(s, "Что мы имеем по факту", "Неделя 21–27 сентября 2026. Восемь сообществ, реальные цифры из отчёта.", 2)

cards = [("969 000", "охват за неделю", AURORA),
         ("47 000", "комментариев", AURORA),
         ("1 515", "заявок", AMBER),
         ("16", "чеков", RED)]
x = Inches(0.7)
for val, lab, col in cards:
    c = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.3), Inches(2.85), Inches(2.1))
    c.fill.solid(); c.fill.fore_color.rgb = PAPER
    c.line.color.rgb = LINE; c.line.width = Pt(1)
    c.shadow.inherit = False
    c.text_frame.text = ""
    text(s, x + Inches(0.2), Inches(2.6), Inches(2.5), Inches(0.9),
         [(val, 34, col, True)])
    text(s, x + Inches(0.2), Inches(3.5), Inches(2.5), Inches(0.6),
         [(lab, 13, TEXT6, False)])
    x += Inches(3.05)

text(s, Inches(0.7), Inches(4.9), Inches(11.9), Inches(1.4),
     [("Воронка работает: 4,85% увидевших пост пишут комментарий —", 17, TEXT, True),
      ("это очень высокая вовлечённость. Механика привлекает людей.", 17, TEXT, True)], space=1.2)
text(s, Inches(0.7), Inches(5.9), Inches(11.9), Inches(1.0),
     [("Но до денег доходят 16 человек. Остальные — теряются по пути.", 15, RED, True)])
notes(s, "Начать с признания: верх воронки работает превосходно. 4,85% — "
         "это уровень, которого в ВК почти никто не достигает. Проблема ниже.")

# ══════════════════════════════════════════════════════════════
# 3. Воронка
# ══════════════════════════════════════════════════════════════
s = slide()
head(s, "Где именно теряются деньги", "Каждая ступень — переход между этапами", 3)

steps = [("969 000", "увидели пост", 11.9, AURORA_L, TEXT),
         ("47 000", "написали слово —  4,85%", 10.2, RGBColor(0xD9,0xD3,0xF7), TEXT),
         ("1 515", "оставили заявку —  3,22%", 8.5, RGBColor(0xF6,0xE3,0xB8), TEXT),
         ("16", "купили —  1,06%", 6.8, RGBColor(0xF7,0xCF,0xCF), RED)]
y = Inches(2.15)
for val, lab, wid, col, tcol in steps:
    x = Inches(0.7) + (Inches(11.9) - Inches(wid)) / 2
    sh = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(wid), Inches(0.82))
    sh.fill.solid(); sh.fill.fore_color.rgb = col
    sh.line.fill.background(); sh.shadow.inherit = False
    sh.text_frame.text = ""
    text(s, x, y + Inches(0.14), Inches(wid), Inches(0.6),
         [(f"{val}   ·   {lab}", 16, tcol, True)], align=PP_ALIGN.CENTER)
    y += Inches(1.06)

text(s, Inches(0.7), Inches(6.5), Inches(11.9), Inches(0.5),
     [("1,06% — это узкое место. Здесь теряется 99 из 100 тёплых заявок.", 15, RED, True)],
     align=PP_ALIGN.CENTER)
notes(s, "Визуально показать сужение. 47 000 человек проявили интерес, "
         "1 515 дошли до кассы, 16 купили. Обрыв — на последнем шаге.")

# ══════════════════════════════════════════════════════════════
# 4. Три обрыва
# ══════════════════════════════════════════════════════════════
s = slide()
head(s, "Три обрыва, каждый стоит денег", None, 4)

data = [("45 485", "написали слово — и не пошли дальше", "97% аудитории",
         "Человек получил половинку предсказания. Дальше нужно уйти в личные сообщения — и он уходит навсегда.", AMBER),
        ("1 499", "дошли до кассы — и не купили", "99% заявок",
         "Перевод денег на карту в переписке. Нет доверия, нет удобства, нет мгновенности.", RED),
        ("0", "вернулись, чтобы купить снова", "нет возврата",
         "Разбор куплен один раз. Поводов вернуться в приложение нет — человек исчезает.", RED)]
x = Inches(0.7)
for big, mid, tag, body, col in data:
    c = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.1), Inches(3.85), Inches(4.2))
    c.fill.solid(); c.fill.fore_color.rgb = PAPER
    c.line.color.rgb = LINE; c.line.width = Pt(1); c.shadow.inherit = False
    c.text_frame.text = ""
    text(s, x + Inches(0.3), Inches(2.4), Inches(3.3), Inches(0.3),
         [(tag.upper(), 10, TEXT4, True)])
    text(s, x + Inches(0.3), Inches(2.75), Inches(3.3), Inches(0.8),
         [(big, 38, col, True)])
    text(s, x + Inches(0.3), Inches(3.65), Inches(3.25), Inches(0.9),
         [(mid, 15, TEXT, True)], space=1.15)
    text(s, x + Inches(0.3), Inches(4.55), Inches(3.25), Inches(1.6),
         [(body, 12.5, TEXT6, False)], space=1.2)
    x += Inches(4.05)
notes(s, "Первый обрыв — самый массовый по количеству людей. "
         "Второй — самый дорогой: люди уже дошли до кассы и развернулись. "
         "Третий — про то, что возврата нет вообще.")

# ══════════════════════════════════════════════════════════════
# 5. Сколько теряем
# ══════════════════════════════════════════════════════════════
s = slide()
head(s, "Сколько это стоит", "Та же аудитория, тот же трафик, ноль дополнительных затрат на рекламу", 5)

rows = [("Конверсия заявка→чек", "Чеков в неделю", "Выручка в месяц", False),
        ("1,06%  (сейчас)", "16", "93 000 ₽", True),
        ("2%", "30", "174 000 ₽", False),
        ("3%", "45", "261 000 ₽", False),
        ("5%", "76", "435 000 ₽", False)]
y = Inches(2.2)
for label, chk, money, now in rows:
    bg = AURORA_L if now else (WHITE if label != rows[0][0] else PAPER)
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.7), y, Inches(11.9), Inches(0.72))
    r.fill.solid(); r.fill.fore_color.rgb = bg
    r.line.fill.background(); r.shadow.inherit = False
    bold = now or label == rows[0][0]
    col = TEXT if not now else AURORA
    text(s, Inches(1.0), y + Inches(0.18), Inches(6.0), Inches(0.4),
         [(label, 14, col, bold)])
    text(s, Inches(7.0), y + Inches(0.18), Inches(2.4), Inches(0.4),
         [(chk, 14, col, bold)], align=PP_ALIGN.CENTER)
    text(s, Inches(9.6), y + Inches(0.18), Inches(2.7), Inches(0.4),
         [(money, 14, col, bold)], align=PP_ALIGN.RIGHT)
    y += Inches(0.78)

text(s, Inches(0.7), Inches(6.15), Inches(11.9), Inches(0.7),
     [("Средний чек 1 435 ₽. Даже рост конверсии до 3% — это +168 000 ₽ в месяц", 15, TEXT, True),
      ("с той аудитории, которую мы уже приводим и за которую уже платим.", 15, TEXT, True)], space=1.15)
notes(s, "Ключевой слайд для экономики. Мы не просим больше трафика — "
         "мы предлагаем перестать терять уже привлечённых людей.")

# ══════════════════════════════════════════════════════════════
# 6. Диагноз
# ══════════════════════════════════════════════════════════════
s = slide(NIGHT)
text(s, Inches(1.0), Inches(1.6), Inches(11.3), Inches(0.5),
     [("ДИАГНОЗ", 12, RGBColor(0x8B,0x7B,0xEA), True)])
text(s, Inches(1.0), Inches(2.2), Inches(11.3), Inches(2.4),
     [("Это не проблема трафика.", 34, WHITE, True),
      ("Трафик работает — 969 000 охвата и 47 000 реакций.", 34, WHITE, True)], space=1.0)
ln = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(4.5), Inches(2.2), Inches(0.06))
ln.fill.solid(); ln.fill.fore_color.rgb = MINT; ln.line.fill.background()
text(s, Inches(1.0), Inches(4.9), Inches(11.3), Inches(2.0),
     [("Это проблема поверхности продажи.", 34, RGBColor(0x8B,0x7B,0xEA), True),
      ("Люди доходят до интереса и не доходят до оплаты.", 34, WHITE, True)], space=1.0)
notes(s, "Одна мысль на слайде. Проблема не в том, что мало людей. "
         "Проблема в том, где мы предлагаем им заплатить.")

# ══════════════════════════════════════════════════════════════
# 7. Решение
# ══════════════════════════════════════════════════════════════
s = slide()
head(s, "Решение: приложение вместо переписки", "Автоматическая продажа там, где сейчас ручная", 7)

rows = [("Человек написал слово", "Сейчас: бот пишет в ЛС → уходит в диалог → теряется",
         "Станет: бот даёт ссылку на приложение"),
        ("Получил половинку", "Сейчас: текст в комментарии",
         "Станет: персональная карта, посчитанная по его данным"),
        ("Дошёл до оплаты", "Сейчас: перевод на карту в переписке",
         "Станет: нативное окно оплаты ВК — одно нажатие"),
        ("Получил разбор", "Сейчас: ждёт ответа менеджера",
         "Станет: мгновенно, за 2 секунды"),
        ("Что дальше", "Сейчас: ничего, человек исчез",
         "Станет: ежедневная карта и повод вернуться")]
y = Inches(2.1)
for title, now, after in rows:
    r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.7), y, Inches(11.9), Inches(0.86))
    r.fill.solid(); r.fill.fore_color.rgb = PAPER
    r.line.color.rgb = LINE; r.line.width = Pt(0.75); r.shadow.inherit = False
    r.text_frame.text = ""
    text(s, Inches(1.0), y + Inches(0.13), Inches(3.0), Inches(0.6),
         [(title, 14, TEXT, True)], anchor=MSO_ANCHOR.MIDDLE)
    text(s, Inches(4.0), y + Inches(0.09), Inches(4.1), Inches(0.7),
         [(now, 11, RED, False)], anchor=MSO_ANCHOR.MIDDLE, space=1.1)
    text(s, Inches(8.3), y + Inches(0.09), Inches(4.1), Inches(0.7),
         [(after, 11, RGBColor(0x1F,0x7A,0x63), True)], anchor=MSO_ANCHOR.MIDDLE, space=1.1)
    y += Inches(0.94)
notes(s, "Суть решения: убрать из пути к оплате переписку и перевод на карту. "
         "Оплата происходит внутри ВК, нативно, в один тап.")

# ══════════════════════════════════════════════════════════════
# 8. Почему сработает
# ══════════════════════════════════════════════════════════════
s = slide()
head(s, "Почему это сработает именно у нас", None, 8)

items = [("Наша аудитория уже платит", "16 чеков в неделю — доказательство спроса. Мы не проверяем гипотезу «будут ли платить» с нуля.", MINT),
         ("Механика вовлечения работает", "4,85% реакции на пост. Это готовый поток людей — надо только не терять их в конце.", MINT),
         ("У нас есть эксперты, у конкурента — нет", "Астролябия продаёт алгоритм. Мы продаём разбор от живого практика — за это платят охотнее.", MINT)]
y = Inches(2.2)
for t, d, col in items:
    bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.7), y, Inches(0.08), Inches(1.3))
    bar.fill.solid(); bar.fill.fore_color.rgb = col; bar.line.fill.background()
    text(s, Inches(1.05), y + Inches(0.05), Inches(11.3), Inches(0.45),
         [(t, 17, TEXT, True)])
    text(s, Inches(1.05), y + Inches(0.52), Inches(11.3), Inches(0.8),
         [(d, 13, TEXT6, False)], space=1.15)
    y += Inches(1.5)
notes(s, "Три причины, почему это не фантазия: спрос доказан, поток есть, "
         "а живой эксперт — то преимущество, которого нет у алгоритмических сервисов.")

# ══════════════════════════════════════════════════════════════
# 9. Что уже готово
# ══════════════════════════════════════════════════════════════
s = slide()
head(s, "Что уже работает", "Прототип собран и открывается внутри ВК", 9)

left = [("Работает в ВК", "мини-приложение открывается и на компьютере, и на iPhone"),
        ("Считает карту", "Солнце, Луна, Асцендент и семь планет с точными градусами"),
        ("Пишет разбор", "живые тексты, генерируются под конкретную карту"),
        ("Полный путь", "от поста до экрана оплаты и готового разбора")]
right = [("Автономность", "нет внешних зависимостей — всё со своего сервера"),
         ("Проверка запуска", "защита от подделки данных ВК"),
         ("Запасной режим", "если генерация недоступна — работает на шаблонах"),
         ("Ключ подписи", "осталось вписать — 5 минут")]

y = Inches(2.15)
for (t1, d1), (t2, d2) in zip(left, right):
    for x, t, d in ((Inches(0.7), t1, d1), (Inches(6.85), t2, d2)):
        c = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.75), Inches(0.95))
        c.fill.solid(); c.fill.fore_color.rgb = PAPER
        c.line.color.rgb = LINE; c.line.width = Pt(0.75); c.shadow.inherit = False
        c.text_frame.text = ""
        text(s, x + Inches(0.25), y + Inches(0.13), Inches(5.2), Inches(0.35),
             [(t, 14, TEXT, True)])
        text(s, x + Inches(0.25), y + Inches(0.48), Inches(5.2), Inches(0.4),
             [(d, 11, TEXT6, False)])
    y += Inches(1.05)
notes(s, "Подчеркнуть: это не макет на слайдах. Это работающее приложение, "
         "которое можно открыть прямо на встрече и пройти путь целиком.")

# ══════════════════════════════════════════════════════════════
# 10. Что нужно
# ══════════════════════════════════════════════════════════════
s = slide()
head(s, "Что нужно, чтобы запустить", None, 10)

asks = [("Ключ подписи ВК", "5 минут", "Взять в настройках приложения и вписать в конфигурацию", MINT),
        ("Часовые пояса", "1–2 дня", "Сейчас для рождённых до 2014 года Асцендент может быть неверным. Без этого приложение врёт", AMBER),
        ("Соглашение и политика ПД", "готовлю", "Обязательное условие ВК для модерации. Собираем дату и место рождения — это персональные данные", AMBER),
        ("Хостинг", "200–500 ₽/мес", "Сейчас работает через туннель с ноутбука. Для постоянной ссылки нужен свой сервер", AURORA),
        ("Пополнение KIE", "по расходу", "Каждая генерация разбора стоит денег. Кредиты расходуются", AURORA)]

y = Inches(2.0)
for t, when, why, col in asks:
    r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.7), y, Inches(11.9), Inches(0.86))
    r.fill.solid(); r.fill.fore_color.rgb = PAPER
    r.line.color.rgb = LINE; r.line.width = Pt(0.75); r.shadow.inherit = False
    r.text_frame.text = ""
    text(s, Inches(1.0), y + Inches(0.12), Inches(3.3), Inches(0.6),
         [(t, 14, TEXT, True)], anchor=MSO_ANCHOR.MIDDLE)
    tag = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.35), y + Inches(0.24), Inches(1.55), Inches(0.38))
    tag.fill.solid(); tag.fill.fore_color.rgb = col; tag.line.fill.background()
    tag.text_frame.text = ""
    text(s, Inches(4.35), y + Inches(0.29), Inches(1.55), Inches(0.3),
         [(when, 10, WHITE, True)], align=PP_ALIGN.CENTER)
    text(s, Inches(6.1), y + Inches(0.12), Inches(6.2), Inches(0.65),
         [(why, 11, TEXT6, False)], anchor=MSO_ANCHOR.MIDDLE, space=1.1)
    y += Inches(0.94)
notes(s, "Пять пунктов, из них три — не деньги, а время и решения. "
         "Ключ подписи и часовые пояса закрываются за пару дней.")

# ══════════════════════════════════════════════════════════════
# 11. План
# ══════════════════════════════════════════════════════════════
s = slide()
head(s, "План", "Что за чем", 11)

phases = [("Сейчас", "Прототип работает. Показываем и согласовываем решение", MINT),
          ("Неделя 1", "Часовые пояса + ключ подписи. Соглашение и политика ПД", AURORA),
          ("Неделя 2", "Хостинг, постоянная ссылка. Первый замер конверсии на одном канале", AURORA),
          ("Дальше", "Модерация в ВК → масштабирование на все восемь сообществ", NIGHT2)]
y = Inches(2.2)
for when, what, col in phases:
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.9), y + Inches(0.18), Inches(0.3), Inches(0.3))
    dot.fill.solid(); dot.fill.fore_color.rgb = col; dot.line.fill.background()
    if when != phases[-1][0]:
        ln = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.04), y + Inches(0.5), Inches(0.02), Inches(0.85))
        ln.fill.solid(); ln.fill.fore_color.rgb = LINE; ln.line.fill.background()
    text(s, Inches(1.6), y + Inches(0.1), Inches(2.2), Inches(0.5),
         [(when, 16, col if col != NIGHT2 else TEXT, True)])
    text(s, Inches(3.9), y + Inches(0.1), Inches(8.5), Inches(0.8),
         [(what, 14, TEXT6, False)], space=1.15)
    y += Inches(1.15)
notes(s, "Показать, что путь короткий и понятный. Самое долгое — модерация ВК, "
         "и она не в нашей власти.")

# ══════════════════════════════════════════════════════════════
# 12. Итог
# ══════════════════════════════════════════════════════════════
s = slide(NIGHT)
text(s, Inches(1.0), Inches(1.7), Inches(11.3), Inches(0.5),
     [("ГЛАВНОЕ", 12, RGBColor(0x8B,0x7B,0xEA), True)])
text(s, Inches(1.0), Inches(2.4), Inches(11.3), Inches(2.2),
     [("Мы уже платим за этот трафик.", 36, WHITE, True),
      ("Вопрос только в том,", 36, WHITE, True),
      ("сколько из него доходит до кассы.", 36, RGBColor(0x8B,0x7B,0xEA), True)], space=1.0)
ln = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(5.1), Inches(2.2), Inches(0.06))
ln.fill.solid(); ln.fill.fore_color.rgb = MINT; ln.line.fill.background()
text(s, Inches(1.0), Inches(5.5), Inches(11.3), Inches(1.2),
     [("Сейчас доходит 16 человек из 969 000. Приложение меняет это без", 15, RGBColor(0xB8,0xB2,0xD8), False),
      ("единого дополнительного рубля на рекламу.", 15, RGBColor(0xB8,0xB2,0xD8), False)], space=1.2)
notes(s, "Закончить одной мыслью: деньги не нужно искать снаружи. "
         "Они уже внутри воронки, просто не доходят.")

prs.save("deck/Свой круг — почему теряем деньги.pptx")
print("слайдов:", len(prs.slides.__iter__.__self__._sldIdLst))
