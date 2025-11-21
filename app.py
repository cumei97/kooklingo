# streamlit_app.py
# K-pop 沉浸式韩语学习助手 — MVP 演示原型
# 功能：
# 1) 多语言 UI（中/韩/英）
# 2) Weverse 直播解析模拟：输入 URL -> 加载模拟视频 + 双语字幕流
# 3) 交互式学习与生词本（点击词查看详情并加入生词本）
# 4) TOPIK 水平自测（5-8 题，自动评分与等级估计）
# 5) 爱豆语言画像（示例数据：以 BTS 成员为例，展示高频词/副词统计/语态分析）
#
# 注意：本演示使用模拟数据，无需任何外部 API，直接运行即可。
# 另外：根据开发者指示，这里将示例“上传文件”路径以本地路径方式使用（用于演示占位图/视频）。
# 使用到的本地文件路径（来自你上传的文件历史）：
#   /mnt/data/1999D0C2-880F-462A-854D-9D6B870CC9E2.jpeg
#   /mnt/data/B52A860B-7AEF-4BF7-8D58-7095346AA56B.jpeg

import streamlit as st
import pandas as pd
import numpy as np
import time
import json
from datetime import timedelta
import matplotlib.pyplot as plt
from io import BytesIO

st.set_page_config(page_title="K-pop 韩语学习助手 — ian字幕 MVP", layout="wide")

# -------------------------
# 1. MULTI-LANGUAGE DICTIONARY
# -------------------------
LANG = {
    "zh": {
        "title": "K-pop 沉浸式韩语学习助手",
        "weverse_input": "粘贴 Weverse 直播链接（示例模式）",
        "load_demo": "加载示例直播",
        "start_sim": "开始模拟播放",
        "stop_sim": "停止",
        "vocab_book": "我的生词本",
        "add_vocab": "添加到生词本",
        "test": "能力测试",
        "insight": "爱豆语言画像 (Idol Insight)",
        "export_subs": "导出字幕 (SRT / TXT)",
        "select_lang": "界面语言 / Interface Language",
        "subtitle_area": "字幕区（点击高亮词查看详情）",
        "explain": "词语解释",
        "orig": "原文",
        "trans": "译文",
        "difficulty": "TOPIK 等级估计",
        "score": "得分",
        "level": "预计 TOPIK 等级",
        "no_vocab": "你还没有收藏单词。",
        "remove": "从生词本移除",
    },
    "ko": {
        "title": "K-pop 몰입형 한국어 학습 도우미",
        "weverse_input": "Weverse 라이브 링크 붙여넣기 (데모 모드)",
        "load_demo": "데모 라이브 불러오기",
        "start_sim": "시뮬레이션 재생",
        "stop_sim": "중지",
        "vocab_book": "내 단어장",
        "add_vocab": "단어장에 추가",
        "test": "실력 테스트",
        "insight": "아이돌 언어 인사이트",
        "export_subs": "자막 내보내기 (SRT / TXT)",
        "select_lang": "인터페이스 언어 / Interface Language",
        "subtitle_area": "자막 영역 (하이라이트 단어 클릭)",
        "explain": "단어 설명",
        "orig": "원문",
        "trans": "번역",
        "difficulty": "TOPIK 레벨 추정",
        "score": "점수",
        "level": "예상 TOPIK 레벨",
        "no_vocab": "아직 저장된 단어가 없습니다.",
        "remove": "단어장 삭제",
    },
    "en": {
        "title": "K-pop Immersive Korean Study Assistant",
        "weverse_input": "Paste Weverse live URL (demo mode)",
        "load_demo": "Load demo live",
        "start_sim": "Start simulation",
        "stop_sim": "Stop",
        "vocab_book": "My Vocab Book",
        "add_vocab": "Add to Vocab",
        "test": "Proficiency Test",
        "insight": "Idol Language Insight",
        "export_subs": "Export subtitles (SRT / TXT)",
        "select_lang": "Interface Language / 界面语言",
        "subtitle_area": "Subtitles area (click highlighted words)",
        "explain": "Word Explanation",
        "orig": "Original",
        "trans": "Translation",
        "difficulty": "TOPIK level estimate",
        "score": "Score",
        "level": "Estimated TOPIK level",
        "no_vocab": "You have no saved vocab yet.",
        "remove": "Remove from vocab",
    }
}

# -------------------------
# Helpers & Session State
# -------------------------
if "lang" not in st.session_state:
    st.session_state.lang = "zh"
if "vocab" not in st.session_state:
    st.session_state.vocab = {}  # word -> {info...}
if "subs_buffer" not in st.session_state:
    st.session_state.subs_buffer = []  # subtitle list
if "sim_playing" not in st.session_state:
    st.session_state.sim_playing = False
if "current_time" not in st.session_state:
    st.session_state.current_time = 0  # milliseconds relative to start
if "weverse_demo_loaded" not in st.session_state:
    st.session_state.weverse_demo_loaded = False
if "test_results" not in st.session_state:
    st.session_state.test_results = None

# translation for UI text
def T(key):
    return LANG[st.session_state.lang].get(key, key)

# -------------------------
# Sidebar: language & navigation
# -------------------------
with st.sidebar:
    st.selectbox(
        T("select_lang"),
        options=[("中文", "zh"), ("한국어", "ko"), ("English", "en")],
        index=["zh", "ko", "en"].index(st.session_state.lang),
        format_func=lambda x: x[0],
        key="ui_lang_select",
        on_change=lambda: st.session_state.update({"lang": st.session_state.ui_lang_select})
    )
    st.title(T("title"))
    page = st.radio("", ["Live Study", T("test"), T("insight"), T("vocab_book")], index=0)
    st.markdown("---")
    st.markdown("**Quick actions**")
    if st.button(T("load_demo")):
        st.session_state.weverse_demo_loaded = False  # reset to force reload

# -------------------------
# Simulated Data: video + subtitles + TOPIK vocab tags
# -------------------------
# Developer-provided local file path used as placeholder "media" (per instructions)
LOCAL_MEDIA_PLACEHOLDER = "/mnt/data/1999D0C2-880F-462A-854D-9D6B870CC9E2.jpeg"
ALT_MEDIA_PLACEHOLDER = "/mnt/data/B52A860B-7AEF-4BF7-8D58-7095346AA56B.jpeg"

# Example subtitle stream (timestamps in ms relative to start)
SIM_SUBS = [
    {"start": 0, "end": 3500, "orig": "안녕하세요 여러분, 오늘은 신곡 리허설이 있어요.", "trans": "大家好，今天有新歌排练。"},
    {"start": 4000, "end": 7500, "orig": "이 노래는 가사에 어려운 표현이 많아요.", "trans": "这首歌的歌词有很多难懂的表达。"},
    {"start": 8000, "end": 11500, "orig": "하지만 연습하면 금방 익힐 수 있습니다.", "trans": "但是练习的话很快就能掌握。"},
    {"start": 12000, "end": 15500, "orig": "발음에 신경 써주세요 — 특히 받침 발음.", "trans": "请注意发音，尤其是尾音。"},
    {"start": 16000, "end": 19500, "orig": "자, 우리 다시 한 번 해볼까요?", "trans": "来，我们再试一次吧？"},
]

# TOPIK-related words in the subtitles with simulated metadata
TOPIK_WORDS = {
    "안녕하세요": {"level": 1, "lemma": "안녕하다", "notes": "常用问候语。"},
    "신곡": {"level": 3, "lemma": "신곡", "notes": "新发布的歌曲。"},
    "리허설": {"level": 4, "lemma": "리허설(연습)", "notes": "排练，彩排。"},
    "가사": {"level": 3, "lemma": "가사", "notes": "歌词。"},
    "발음": {"level": 2, "lemma": "발음", "notes": "发音。"},
    "받침": {"level": 5, "lemma": "받침", "notes": "韩语音节末的收尾辅音。"},
    "연습": {"level": 2, "lemma": "연습하다", "notes": "练习。"},
}

# Utility: simple "AI explanation" generator (simulated)
def explain_word(word):
    meta = TOPIK_WORDS.get(word, None)
    if meta:
        return {
            "word": word,
            "lemma": meta["lemma"],
            "level": meta["level"],
            "explain_cn": f"（模拟）{word} 的中文解释：{meta['notes']}",
            "explain_kr": f"(시뮬레이션) {word}의 설명: {meta['notes']}",
            "grammar": f"示例：{meta['lemma']} + (으)면 ...",
        }
    else:
        # fallback simulated explanation
        return {
            "word": word,
            "lemma": word,
            "level": "unknown",
            "explain_cn": f"（模拟）{word}：暂无详细信息，建议标注为复习单词。",
            "explain_kr": f"(시뮬레이션) {word}: 정보 없음.",
            "grammar": "暂无"
        }

# -------------------------
# Page: Live Study (main)
# -------------------------
def page_live_study():
    st.header(T("title"))
    col1, col2 = st.columns([2, 1])
    with col1:
        st.subheader(T("weverse_input"))
        url_input = st.text_input(T("weverse_input"), placeholder="https://weverse.example/live/...")
        if st.button(T("load_demo") + " (Demo)"):
            # load simulated data
            st.session_state.subs_buffer = SIM_SUBS.copy()
            st.session_state.weverse_demo_loaded = True
            st.success("已加载示例直播与字幕（演示模式）。")
        if st.session_state.weverse_demo_loaded:
            # show media placeholder (local file path used)
            try:
                # If it's an image, display; if a video file existed, st.video would work similarly.
                st.image(LOCAL_MEDIA_PLACEHOLDER, caption="示例直播画面（占位）", use_column_width=True)
            except Exception:
                st.image(ALT_MEDIA_PLACEHOLDER, caption="示例直播画面（占位）", use_column_width=True)

            # Playback controls: simulate time with a slider and play/stop buttons
            cols = st.columns([1,1,4])
            if cols[0].button(T("start_sim")):
                st.session_state.sim_playing = True
                st.session_state.current_time = 0
                st.experimental_rerun()
            if cols[1].button(T("stop_sim")):
                st.session_state.sim_playing = False

            # simulate playback loop (non-blocking)
            placeholder = st.empty()
            # format ms to mm:ss
            def fmt(ms):
                s = int(ms/1000)
                return f"{s//60:02d}:{s%60:02d}"
            # slider to inspect timeline
            max_t = st.session_state.subs_buffer[-1]["end"] if st.session_state.subs_buffer else 20000
            t_slider = cols[2].slider("时间轴", 0, int(max_t), int(st.session_state.current_time), step=500, key="time_slider")
            st.session_state.current_time = t_slider

            if st.session_state.sim_playing:
                # increment time a little and rerun to simulate motion
                st.session_state.current_time = min(max_t, st.session_state.current_time + 1500)
                time.sleep(0.3)
                st.experimental_rerun()

            # show active subtitles based on current_time
            st.markdown("### " + T("subtitle_area"))
            active = [s for s in st.session_state.subs_buffer if (s["start"] <= st.session_state.current_time <= s["end"])]
            if not active:
                # show the next upcoming line
                upcoming = [s for s in st.session_state.subs_buffer if s["start"] > st.session_state.current_time]
                if upcoming:
                    line = upcoming[0]
                else:
                    line = None
                if line:
                    st.info(f"{T('orig')}: {line['orig']}\n\n{T('trans')}: {line['trans']}")
                else:
                    st.write("—")
            else:
                # display active lines with word-level highlighting for TOPIK_WORDS
                for idx, line in enumerate(active):
                    # split orig into words (naive split by spaces and punctuation for demonstration)
                    words = []
                    temp = ""
                    for ch in line["orig"]:
                        if ch.isalnum() or '\uac00' <= ch <= '\ud7a3':  # Korean syllable range heuristic
                            temp += ch
                        else:
                            if temp:
                                words.append(temp)
                                temp = ""
                            words.append(ch)
                    if temp:
                        words.append(temp)
                    # Render with buttons for TOPIK words
                    sub_cols = st.columns([4, 1])
                    with sub_cols[0]:
                        st.write("")
                        line_container = st.container()
                        # We'll construct a row of inline elements; Streamlit has limited inline control,
                        # so we render as markdown mixing **bold** for highlighted words and provide "查看 / 添加" buttons below.
                        display_tokens = []
                        token_buttons = []
                        for i, token in enumerate(words):
                            if token.strip() and token in TOPIK_WORDS:
                                display_tokens.append(f"**<span style='color:#d63384'>{token}</span>**")
                            else:
                                display_tokens.append(token.replace("\n", " "))
                        md = " ".join(display_tokens)
                        # Use unsafe_allow_html via st.markdown to display colored tokens
                        line_container.markdown(md, unsafe_allow_html=True)
                        line_container.markdown(f"*{T('trans')}:* {line['trans']}")
                        # Buttons for each TOPIK word in this line
                        for w in sorted(set([t for t in words if t in TOPIK_WORDS])):
                            bcol1, bcol2 = st.columns([1,4])
                            with bcol1:
                                if st.button(f"🔎 {w}", key=f"explain_{w}_{idx}"):
                                    st.session_state.last_explain = explain_word(w)
                            with bcol2:
                                if st.button(T("add_vocab"), key=f"add_{w}_{idx}"):
                                    info = explain_word(w)
                                    st.session_state.vocab[w] = info
                                    st.success(f"已加入生词本：{w}")
                    with sub_cols[1]:
                        # show timestamp
                        st.caption(f"{fmt(line['start'])} - {fmt(line['end'])}")

            # Export subtitles
            st.markdown("---")
            if st.button(T("export_subs")):
                # Default to SRT
                srt = subs_to_srt(st.session_state.subs_buffer)
                st.download_button("Download SRT", srt, file_name="ian_subtitles.srt", mime="text/plain")
    with col2:
        st.subheader(T("vocab_book"))
        # show user's vocab book
        if not st.session_state.vocab:
            st.info(T("no_vocab"))
        else:
            for w, info in st.session_state.vocab.items():
                with st.expander(f"{w}  —  TOPIK {info.get('level')}"):
                    st.write(T("explain"))
                    if st.session_state.lang == "ko":
                        st.write(info.get("explain_kr"))
                    else:
                        st.write(info.get("explain_cn"))
                    st.write("**Lemma:**", info.get("lemma"))
                    if st.button(T("remove"), key=f"remove_{w}"):
                        del st.session_state.vocab[w]
                        st.experimental_rerun()


# -------------------------
# Subtitle export helper
# -------------------------
def ms_to_srt_time(ms):
    s = int(ms / 1000)
    hh = s // 3600
    mm = (s % 3600) // 60
    ss = s % 60
    mmm = int(ms % 1000)
    return f"{hh:02d}:{mm:02d}:{ss:02d},{mmm:03d}"

def subs_to_srt(subs):
    out = ""
    for i, s in enumerate(subs, 1):
        out += f"{i}\n"
        out += f"{ms_to_srt_time(s['start'])} --> {ms_to_srt_time(s['end'])}\n"
        out += f"{s['orig']}\n{s['trans']}\n\n"
    return out

def subs_to_txt(subs):
    lines = []
    for s in subs:
        t = timedelta(milliseconds=s['start'])
        lines.append(f"[{str(t)}] {s['orig']} / {s['trans']}")
    return "\n".join(lines)

# -------------------------
# Page: Vocab Book (shortcut)
# -------------------------
def page_vocab():
    st.header(T("vocab_book"))
    if not st.session_state.vocab:
        st.info(T("no_vocab"))
    else:
        df = pd.DataFrame([
            {"word": w, "lemma": info.get("lemma"), "level": info.get("level"), "notes": info.get("explain_cn")}
            for w, info in st.session_state.vocab.items()
        ])
        st.dataframe(df)
        # simple review quiz: present random words and ask for translation
        if st.button("复习模式 (简单)"):
            st.session_state.review_queue = list(st.session_state.vocab.keys())
            st.experimental_rerun()
        if "review_queue" in st.session_state and st.session_state.review_queue:
            word = st.session_state.review_queue.pop(0)
            st.write("请翻译或解释: ", word)
            ans = st.text_input("你的答案", key=f"ans_{word}")
            if st.button("提交", key=f"submit_{word}"):
                st.success("已记录（此处为演示，未评分）")
                st.experimental_rerun()

# -------------------------
# Page: TOPIK Proficiency Test
# -------------------------
TEST_QUESTIONS = [
    {
        "q": "다음 중 '발음'의 뜻으로 가장 적절한 것은?",
        "options": ["A. 歌曲", "B. 发音", "C. 练习", "D. 收尾"],
        "answer": "B"
    },
    {
        "q": "다음 문장의 빈칸에 들어갈 표현으로 자연스러운 것은? '나는 매일 ( ) 연습한다.'",
        "options": ["A. 가사", "B. 리허설", "C. 발음", "D. 신곡"],
        "answer": "C"
    },
    {
        "q": "다음 문장 해석으로 옳은 것은? '이 노래는 가사에 어려운 표현이 많아요.'",
        "options": ["A. 这首歌没有歌词。", "B. 歌词有很多简单表达。", "C. 歌词有很多难懂的表达。", "D. 歌词很短。"],
        "answer": "C"
    },
    {
        "q": "다음 중 '받침'에 대한 설명으로 맞는 것은?",
        "options": ["A. 단어의 첫소리", "B. 음절 끝의 자음", "C. 문장의 끝", "D. 동사의 어근"],
        "answer": "B"
    },
    {
        "q": "다음 빈칸에 들어갈 가장 어울리는 표현: '자, 우리 다시 한 번 ( ).'",
        "options": ["A. 가사", "B. 해볼까요", "C. 받침", "D. 리허설"],
        "answer": "B"
    }
]

def page_test():
    st.header(T("test"))
    if st.session_state.test_results:
        res = st.session_state.test_results
        st.success(f"{T('score')}: {res['score']} / {len(TEST_QUESTIONS)}")
        st.info(f"{T('level')}: {res['level']}")
        if st.button("重新测试"):
            st.session_state.test_results = None
            st.experimental_rerun()
        return

    answers = []
    st.write("共计题目：", len(TEST_QUESTIONS))
    form = st.form("test_form")
    user_ans = []
    for i, q in enumerate(TEST_QUESTIONS):
        form.markdown(f"**{i+1}. {q['q']}**")
        key = f"q_{i}"
        choice = form.radio("", q["options"], key=key)
        user_ans.append(choice[0])  # first char A/B/C...
    submitted = form.form_submit_button("提交答案")
    if submitted:
        score = sum(1 for i, q in enumerate(TEST_QUESTIONS) if user_ans[i] == q["answer"])
        # Simple mapping to TOPIK estimate (demo heuristic)
        if score >= 4:
            level = "TOPIK 3-4 (中上)"
        elif score >= 2:
            level = "TOPIK 2 (中级初期)"
        else:
            level = "TOPIK 1 (初学)"
        st.session_state.test_results = {"score": score, "level": level}
        st.experimental_rerun()

# -------------------------
# Page: Idol Insight (示例分析)
# -------------------------
# Simulated corpus & analysis
IDOL_CORPUS = [
    "안녕하세요 여러분 오늘은 신곡 리허설이 있어요",
    "이 노래는 가사에 어려운 표현이 많아요",
    "연습하면 금방 익힐 수 있습니다",
    "발음에 신경 써주세요 특히 받침 발음",
    "우리 다시 한 번 해볼까요"
]

def page_insight():
    st.header(T("insight"))
    st.write("示例：BTS 成员 语言画像（演示数据）")
    # simple frequency
    from collections import Counter
    words = []
    for s in IDOL_CORPUS:
        for tok in s.split():
            words.append(tok.strip())
    freq = Counter(words)
    top = freq.most_common(10)
    df_top = pd.DataFrame(top, columns=["word", "count"])
    st.subheader("高频词 Top10")
    st.table(df_top)
    # bar chart
    fig, ax = plt.subplots()
    ax.bar(df_top['word'], df_top['count'])
    ax.set_xlabel("词")
    ax.set_ylabel("出现次数")
    st.pyplot(fig)

    # adverb-like tokens simulation (we treat some tokens as adverbs)
    advs = {"특히": 5, "금방": 3, "다시": 4}
    st.subheader("常用副词统计 (示例)")
    adv_df = pd.DataFrame(list(advs.items()), columns=["adverb", "count"])
    st.table(adv_df)
    fig2, ax2 = plt.subplots()
    ax2.pie(adv_df['count'], labels=adv_df['adverb'], autopct='%1.1f%%')
    st.pyplot(fig2)

    # voice / mood analysis (simulated)
    mood = {"Informal": 12, "Formal": 3, "Casual": 8}
    st.subheader("语态分析 (示例)")
    mood_df = pd.DataFrame(list(mood.items()), columns=["mood", "count"])
    st.bar_chart(mood_df.set_index("mood"))

    st.markdown("---")
    st.write("提示：此处为示例分析。实际可替换为真实直播语料并使用 NLP 模型提取关键词、情感与语态。")

# -------------------------
# Router
# -------------------------
if "page" not in locals():
    page = page  # from sidebar selection

if page == "Live Study":
    page_live_study()
elif page == T("test"):
    page_test()
elif page == T("insight"):
    page_insight()
elif page == T("vocab_book"):
    page_vocab()
else:
    st.write("Unknown page")

# -------------------------
# Footer: small utilities (export subtitles, show session state)
# -------------------------
st.sidebar.markdown("---")
st.sidebar.write("Demo project — ian字幕 MVP")
if st.sidebar.button("导出当前字幕为 SRT"):
    srt = subs_to_srt(st.session_state.subs_buffer)
    st.sidebar.download_button("Download SRT", srt, file_name="ian_subtitles.srt", mime="text/plain")
if st.sidebar.button("导出当前字幕为 TXT"):
    txt = subs_to_txt(st.session_state.subs_buffer)
    st.sidebar.download_button("Download TXT", txt, file_name="ian_subtitles.txt", mime="text/plain")

# End of app
