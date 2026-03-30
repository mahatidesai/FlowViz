from pydantic import BaseModel, ConfigDict, Field

class FlowRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text: str
    history: list | None = None
    current_diagram: dict | None = Field(default=None, alias="currentDiagram")