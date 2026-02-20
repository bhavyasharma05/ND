import re

STOPWORDS = {
    "what", "is", "the", "a", "an", "of", "in", "on", "for", "to", 
    "and", "or", "with", "by", "from", "at", "how", "why", "can", 
    "you", "tell", "me", "show", "does", "do", "are", "i", "my", 
    "about", "please", "help", "explain", "describe", "list"
}

def generate_title(user_message: str) -> str:
    """
    Generates a deterministic, short title from the user's message.
    1. Cleans punctuation
    2. Removes filler words
    3. Extracts text
    4. Title Cased
    5. Max 60 chars
    """
    if not user_message:
        return "New Chat"

    # 1. Clean punctuation (keep alphanumeric and spaces)
    # Replace non-alphanumeric with space
    clean_text = re.sub(r'[^\w\s]', ' ', user_message)
    
    # 2. Tokenize and remove stopwords
    words = clean_text.split()
    keywords = [
        w for w in words 
        if w.lower() not in STOPWORDS and len(w) > 1
    ]
    
    # Fallback if all words were stopwords
    if not keywords:
        keywords = words[:4]

    # 3. Take first 4-5 keywords
    selected_words = keywords[:5]
    
    # 4. Join and Title Case
    title_str = " ".join(selected_words).title()
    
    # 5. Limit length to 60 chars
    if len(title_str) > 60:
        title_str = title_str[:57] + "..."
        
    return title_str if title_str.strip() else "New Chat"
