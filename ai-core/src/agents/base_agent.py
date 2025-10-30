"""
Base Agent class with enterprise patterns
Provides foundation for all specialized agents
"""
from abc import ABC, abstractmethod
from typing import Any, Optional
from datetime import datetime

from anthropic import Anthropic
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from ..config import settings
from ..utils.logger import LoggerMixin, ai_logger
from ..models.schemas import AgentResult, AgentType


class BaseAgent(ABC, LoggerMixin):
    """
    Abstract base class for all AI agents

    Provides:
    - Anthropic Claude integration
    - Structured logging
    - Error handling and retries
    - Performance tracking
    - Memory management
    """

    def __init__(
        self,
        agent_type: AgentType,
        model: str = settings.ai_model,
        temperature: float = settings.ai_temperature,
        max_tokens: int = settings.ai_max_tokens,
    ):
        self.agent_type = agent_type
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

        # Initialize LLM
        self.llm = ChatAnthropic(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            anthropic_api_key=settings.anthropic_api_key,
            timeout=settings.ai_timeout,
        )

        # Direct Anthropic client for advanced features
        self.anthropic_client = Anthropic(api_key=settings.anthropic_api_key)

        # Agent state
        self.tools_used: list[str] = []
        self.reasoning_steps: list[str] = []

        self.logger.info(
            "agent_initialized",
            agent_type=agent_type.value,
            model=model,
            temperature=temperature,
        )

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the system prompt for this agent"""
        pass

    @abstractmethod
    async def execute(
        self,
        instruction: str,
        context: dict[str, Any],
        **kwargs: Any
    ) -> AgentResult:
        """Execute the agent's primary task"""
        pass

    async def _invoke_llm(
        self,
        messages: list[BaseMessage],
        **kwargs: Any
    ) -> Any:
        """
        Invoke LLM with error handling and logging
        """
        start_time = datetime.utcnow()

        try:
            self.logger.info(
                "llm_invoke_start",
                model=self.model,
                message_count=len(messages),
            )

            response = await self.llm.ainvoke(messages, **kwargs)

            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

            # Log inference metrics
            ai_logger.log_inference(
                model=self.model,
                prompt_tokens=response.response_metadata.get("usage", {}).get("input_tokens", 0),
                completion_tokens=response.response_metadata.get("usage", {}).get("output_tokens", 0),
                duration_ms=duration_ms,
                success=True,
            )

            return response

        except Exception as e:
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

            self.logger.error(
                "llm_invoke_error",
                error=str(e),
                duration_ms=duration_ms,
            )

            ai_logger.log_inference(
                model=self.model,
                prompt_tokens=0,
                completion_tokens=0,
                duration_ms=duration_ms,
                success=False,
                error=str(e),
            )

            raise

    def _create_prompt_template(
        self,
        system_prompt: str,
        include_history: bool = False
    ) -> ChatPromptTemplate:
        """Create a prompt template for the agent"""

        components = [
            ("system", system_prompt),
        ]

        if include_history:
            components.append(MessagesPlaceholder(variable_name="history"))

        components.append(("human", "{input}"))

        return ChatPromptTemplate.from_messages(components)

    def add_reasoning_step(self, step: str) -> None:
        """Record a reasoning step for transparency"""
        self.reasoning_steps.append(step)
        self.logger.debug("reasoning_step", step=step)

    def use_tool(self, tool_name: str, **kwargs: Any) -> None:
        """Record tool usage"""
        self.tools_used.append(tool_name)

        ai_logger.log_agent_action(
            agent_name=self.agent_type.value,
            action="tool_use",
            tool=tool_name,
            success=True,
            **kwargs
        )

    async def analyze_with_structured_output(
        self,
        prompt: str,
        output_schema: type[BaseModel],
        context: Optional[dict[str, Any]] = None
    ) -> Any:
        """
        Get structured output from Claude using Pydantic models
        """
        self.add_reasoning_step(f"Analyzing with structured output: {output_schema.__name__}")

        try:
            # Use Anthropic's structured output
            messages = [
                SystemMessage(content=self.get_system_prompt()),
                HumanMessage(content=prompt)
            ]

            if context:
                messages.insert(1, HumanMessage(content=f"Context: {context}"))

            response = await self._invoke_llm(messages)

            # Parse to Pydantic model
            # Note: For true structured output, you'd use Anthropic's JSON mode
            # This is a simplified version
            return response

        except Exception as e:
            self.logger.error(
                "structured_output_error",
                schema=output_schema.__name__,
                error=str(e)
            )
            raise

    def get_agent_metrics(self) -> dict[str, Any]:
        """Get performance metrics for this agent"""
        return {
            "agent_type": self.agent_type.value,
            "tools_used": self.tools_used,
            "reasoning_steps_count": len(self.reasoning_steps),
            "model": self.model,
            "temperature": self.temperature,
        }

    def reset_state(self) -> None:
        """Reset agent state between executions"""
        self.tools_used = []
        self.reasoning_steps = []


class AgentOrchestrator(LoggerMixin):
    """
    Orchestrates multiple agents for complex tasks
    Manages agent lifecycle, coordination, and results aggregation
    """

    def __init__(self):
        self.agents: dict[AgentType, BaseAgent] = {}
        self.execution_history: list[dict[str, Any]] = []

    def register_agent(self, agent: BaseAgent) -> None:
        """Register an agent with the orchestrator"""
        self.agents[agent.agent_type] = agent
        self.logger.info("agent_registered", agent_type=agent.agent_type.value)

    async def execute_task(
        self,
        agent_type: AgentType,
        instruction: str,
        context: dict[str, Any],
        **kwargs: Any
    ) -> AgentResult:
        """Execute a task with the specified agent"""

        if agent_type not in self.agents:
            raise ValueError(f"Agent {agent_type} not registered")

        agent = self.agents[agent_type]

        self.logger.info(
            "task_execution_start",
            agent_type=agent_type.value,
            instruction_length=len(instruction),
        )

        try:
            result = await agent.execute(instruction, context, **kwargs)

            self.execution_history.append({
                "agent_type": agent_type.value,
                "instruction": instruction,
                "result": result.dict(),
                "timestamp": datetime.utcnow().isoformat(),
            })

            return result

        except Exception as e:
            self.logger.error(
                "task_execution_error",
                agent_type=agent_type.value,
                error=str(e),
            )
            raise

    async def execute_workflow(
        self,
        tasks: list[tuple[AgentType, str, dict[str, Any]]],
        parallel: bool = False
    ) -> list[AgentResult]:
        """
        Execute multiple agent tasks in sequence or parallel
        """
        if parallel:
            import asyncio
            return await asyncio.gather(*[
                self.execute_task(agent_type, instruction, context)
                for agent_type, instruction, context in tasks
            ])
        else:
            results = []
            for agent_type, instruction, context in tasks:
                result = await self.execute_task(agent_type, instruction, context)
                results.append(result)
                # Pass results as context to next agent
                context["previous_results"] = [r.dict() for r in results]
            return results
