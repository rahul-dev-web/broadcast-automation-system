class LocalOcr:
    def __init__(self, language="en"):
        try:
            from paddleocr import PaddleOCR
        except ImportError as exc:
            raise RuntimeError("PaddleOCR is not installed. Keep OCR disabled for capture proof.") from exc
        self.engine=PaddleOCR(lang=language,use_doc_orientation_classify=False,use_doc_unwarping=False,use_textline_orientation=False)

    def read(self,image):
        result=self.engine.predict(image)
        out=[]
        for page in result:
            payload=page.json if hasattr(page,"json") else page
            if not isinstance(payload,dict): continue
            data=payload.get("res",payload)
            texts=data.get("rec_texts",[]) if isinstance(data,dict) else []
            scores=data.get("rec_scores",[]) if isinstance(data,dict) else []
            for i,text in enumerate(texts):
                value=str(text).strip()
                if value: out.append({"text":value,"confidence":float(scores[i]) if i<len(scores) else 0.0})
        return out
