export interface QuestionDiagnostic {
  code: string;
  title: string;
  detail: string;
}
export interface QuestionSuggestion {
  question: string;
  reason: string;
}
export interface QuestionOptimization {
  domain: string;
  recognized: boolean;
  diagnostics: QuestionDiagnostic[];
  suggestions: QuestionSuggestion[];
}

// ponytail: 透明的关键词规则只提供编辑支架，不推断人物动机；复杂语义交给用户确认。
export function optimizeQuestion(raw: string): QuestionOptimization {
  const original =
    typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  const q = original.slice(0, 500);
  const diagnostics: QuestionDiagnostic[] = [];
  const add = (code: string, title: string, detail: string) =>
    diagnostics.push({ code, title, detail });
  const patterns = {
    health:
      /健康|疾病|症状|诊断|癌|怀孕|手术|停药|吃药|治愈|痊愈|寿命|活多久|抑郁症|焦虑症/,
    legal: /官司|诉讼|律师|违法|判刑|胜诉|仲裁|法律|合同纠纷|劳动合同/,
    finance: /投资|股票|基金|炒股|币价|加密货币|贷款|借款|财务|发财|存款|债务/,
    career:
      /工作|求职|面试|简历|招聘|职场|职业|离职|辞职|跳槽|升职|上司|老板|同事|项目|转行|加班|绩效|工资|薪酬|投递|offer/i,
    relationship:
      /喜欢我|喜不喜欢|爱不爱|爱我|复合|恋爱|感情|分手|伴侣|暧昧|前任|婚姻|对象|约会|亲密|结婚/,
    social: /朋友|同学|室友|家人|人际|合作|沟通|团队|父母|群聊|争吵|冲突|排挤/,
    growth:
      /学习|考试|考研|考公|考上|备考|学业|成长|自信|习惯|焦虑|迷茫|自我|拖延|坚持|方向|情绪|技能|练习/,
  };
  const explicitTime = q.match(
    /今天|明天|本周|下周|本月|下月|今年|明年|(?:未来|接下来|今后|最近)?[一二三四五六七八九十两\d]+(?:个)?(?:小时|天|周|星期|月|年)(?:内|里|之内)?/,
  )?.[0];
  const time = explicitTime || "未来两周";
  const timeReason = explicitTime
    ? `保留你提出的“${explicitTime}”，将它用于观察与行动范围。`
    : "以未来两周作为可修改的练习窗口，不是承诺结果会在两周内发生。";
  const recognizedDomains = Object.entries(patterns)
    .filter(([, pattern]) => pattern.test(q))
    .map(([name]) => name);
  const domainKey = recognizedDomains[0] || "general";
  const names: Record<string, string> = {
    health: "健康与求助",
    legal: "法律与准备",
    finance: "财务与风险",
    career: "求职与事业",
    relationship: "爱情与亲密关系",
    social: "人际关系",
    growth: "个人成长与学习",
    general: "通用探索",
  };
  const recognized = domainKey !== "general";
  const complexNegation = /不是不|并非不|不代表不|不能不|不得不/.test(q);
  if (complexNegation)
    add(
      "negation",
      "复杂否定需要你手动确认",
      "规则无法可靠判断双重否定或不得已的选择。请先核对自己的真实意愿，下面的建议不能代替你决定去留或恢复关系。",
    );
  if (!q)
    add(
      "empty",
      "先补一个具体问题",
      "写出一件真实情境和你最想理解的一个关注点，再用下面的通用框架改写。",
    );
  if (original.length > 500)
    add(
      "length",
      "问题较长，先提炼核心",
      "当前规则只检查前500字。请保留与这次练习有关的背景，避免把整段经历都压进一个问题。",
    );
  if (
    q &&
    (q.length < 6 ||
      (/人生|命运|运势|一切|所有方面|整体未来/.test(q) &&
        !/工作|关系|感情|学习|项目|职业|求职/.test(q)))
  )
    add(
      "broad",
      "范围可能太宽",
      "先选一个具体领域或情境，说明你现在遇到的困难；“整个人生会怎样”难以连接到可检查的行动。",
    );
  const independentTopics = [
    /工作|求职|事业/,
    /感情|恋爱|复合|婚姻/,
    /学习|考试/,
    /健康|疾病/,
  ].filter((p) => p.test(q)).length;
  const questions = (q.match(/[?？]/g) || []).length;
  if (
    questions > 1 ||
    /另外|还想问|又想知道|同时想问|以及是否/.test(q) ||
    (independentTopics >= 2 &&
      /和|以及|还有|分别|[,，、；;]/.test(q) &&
      !/兼顾|平衡|协调|取舍|安排/.test(q))
  )
    add(
      "multiple",
      "可能包含多个独立问题",
      "每次先选一个核心问题。确实在讨论“如何平衡两项责任”时，可以保留这个共同主题，不必机械拆开。",
    );
  if (
    /(?:他|她|对方|老板|上司|同事|前任|朋友).{0,18}(?:喜不喜欢|爱不爱|喜欢我|爱我|想不想|想我|怎么想|在想什么|真实想法|内心|心里|动机|讨厌我|怎么看我|是不是故意|是否故意|有没有想)/.test(
      q,
    )
  )
    add(
      "mindreading",
      "涉及无法直接确认的他人心理",
      "牌面不能核实别人的心思。可以改问可观察的互动、你的期待与边界，或你准备怎样沟通。",
    );
  if (
    /一定|肯定|必然|保证|注定|命中|必定|百分之百|百分百|100%|到底会不会|到底能不能|会不会|是否会|能否成功|会成功吗|会失败吗|结局是什么|结果怎样/.test(
      q,
    ) ||
    /(?:什么时候|何时|几月|哪天|多久).{0,18}(?:找到|遇到|复合|结婚|怀孕|升职|发财|成功|痊愈|变好|结束|得到|拿到|会)/.test(
      q,
    )
  )
    add(
      "prediction",
      "结果或时间不能由牌面保证",
      "把确定结果改为目前条件、可能阻碍和自己可采取的行动。时间范围帮助观察，不是对未来的截止承诺。",
    );
  if (
    q &&
    /吗[?？]?$|是不是|是否|能否/.test(q) &&
    !/如何|怎样|哪些|什么|怎么|哪种/.test(q)
  )
    add(
      "closed",
      "可以试着打开问题",
      "封闭式问题并非语言错误，但单纯“是/否”通常省略原因与行动。改问哪些条件、怎样应对，会更有学习价值。",
    );
  if (
    /再抽|重抽|再问|一直问|问了.{0,8}(?:次|遍)|抽到满意|直到.{0,8}(?:满意|好牌)|还是同一个问题/.test(
      q,
    )
  )
    add(
      "repeat",
      "留意重复提问带来的确认循环",
      "先保留第一次记录，选择观察期或行动，再复盘。没有新信息时不断重抽，容易只记住想要的答案。",
    );
  if (
    /证明|证实|果然|肯定就是|是不是注定|是不是渣男|是不是坏人|是不是因为我太差|是不是没救|是不是很差|是不是不配/.test(
      q,
    )
  )
    add(
      "leading",
      "问题可能预设了结论",
      "把“证明我已经相信的结论”改为可以容纳反证的问题，避免用牌义给自己或他人定性。",
    );
  if (["health", "legal", "finance"].includes(domainKey))
    add(
      "boundary",
      "先确认专业事项的边界",
      "塔罗不能诊断、判断法律结果或保证投资收益。下面只帮助整理担忧、事实、支持与专业咨询问题，不代替现实评估。",
    );
  if (q && !explicitTime)
    add(
      "time",
      "可以约定一个观察窗口",
      "给自己的行动与复盘安排一个合理时间范围；不必要求具体事件在这个时间内必然发生。",
    );
  if (q && !recognized)
    add(
      "uncertain",
      "规则未识别出可靠的情境",
      "本工具没有深度理解或读心能力。下面是通用提问支架，请补上具体对象、已知事实和你真正想探索的事。",
    );
  if (q && !diagnostics.length)
    add(
      "clear",
      "问题已具备探索性",
      "目前规则未发现明显风险，但这不是质量认证。请再确认它是否聚焦一个主题、允许不同答案，并能连接现实观察。",
    );
  const suggest = (question: string, reason: string): QuestionSuggestion => ({
    question,
    reason,
  });
  let suggestions: QuestionSuggestion[];
  if (domainKey === "health")
    suggestions = [
      suggest(
        "围绕这次健康担忧，我需要向合适的专业人员确认哪些事实？",
        "把诊断与结果交给现实评估，塔罗练习只用于整理需要询问的事项。",
      ),
      suggest(
        "等待专业评估时，我可以怎样安排支持与日常照顾？",
        "关注自己可以安排的支持，不从牌面推出治疗或停药建议。",
      ),
      suggest(
        "对于这次健康问题，我最需要认识并表达的担忧是什么？",
        "把情绪反思与身体状况的判断分开。",
      ),
    ];
  else if (domainKey === "legal")
    suggestions = [
      suggest(
        "围绕这次法律问题，我需要整理哪些事实与文件以便咨询专业人士？",
        "从预测输赢转向准备可核实资料。",
      ),
      suggest(
        "在得到专业意见前，我需要认识哪些影响判断的担忧或期待？",
        "练习觉察情绪，不让牌面替代法律分析。",
      ),
      suggest(
        "我应向合适的专业人士确认这件事的哪些程序与责任？",
        "把程序与责任回到实际规则，不用抽牌宣判结果。",
      ),
    ];
  else if (domainKey === "finance")
    suggestions = [
      suggest(
        "在作出这项财务决定前，我需要核实哪些成本与可能损失？",
        "关注信息完整性，不预测价格、收益或获利日期。",
      ),
      suggest(
        "我对这项财务选择有哪些期待或担忧正在影响判断？",
        "将个人感受与客观资料分开，再进行现实评估。",
      ),
      suggest(
        "我需要向可靠资料或合适的专业人士确认哪些财务条件？",
        "让抽牌帮助整理问题，而不是替代预算、风险分析和专业意见。",
      ),
    ];
  else if (domainKey === "career") {
    if (
      !complexNegation &&
      /不想.{0,5}(?:离职|辞职|跳槽|换工作)|不打算.{0,4}(?:离职|辞职|跳槽)|暂不离职|不离职|不辞职|继续留任|留在现岗位/.test(
        q,
      )
    )
      suggestions = [
        suggest(
          `在继续留任的前提下，${time}我最需要改善的具体工作条件是什么？`,
          "保留你希望留下的约束，不把改善工作改写成辞职建议。" + timeReason,
        ),
        suggest(
          "在目前岗位上，我需要与相关人员澄清哪些需求或边界？",
          "聚焦可讨论的条件，不把他人的心理当作已知。",
        ),
        suggest(
          `${time}，我可以在现岗位尝试哪一个小调整，并用什么迹象复盘？`,
          "用一个行动及其检查标准组织练习，是否有效仍要现实观察。",
        ),
      ];
    else if (/求职|找工作|找到工作|面试|简历|投递|offer|招聘/i.test(q))
      suggestions = [
        suggest(
          "目前求职过程中，有哪些可能的阻碍最值得我用事实核实？",
          "保留求职目标，把等待结果变成识别和核实条件。",
        ),
        suggest(
          `${time}，为了增加找到合适工作的机会，我可以改进哪项准备？`,
          "聚焦简历、作品、面试或搜索等自己能做的准备，不保证录用。" +
            timeReason,
        ),
        suggest(
          "我可以用哪些具体标准评估正在考虑的岗位是否适合自己？",
          "把“有没有工作”展开为岗位匹配与个人价值的判断。",
        ),
      ];
    else if (/同事|上司|老板|团队|合作/.test(q)) {
      const target = /上司|老板/.test(q)
        ? "与上级的工作沟通"
        : /同事/.test(q)
          ? "与同事的合作"
          : "团队合作";
      suggestions = [
        suggest(
          `在${target}中，我可以观察哪些行为来理解目前的困难？`,
          "保留工作互动背景，以行为与约定替代猜测对方动机。",
        ),
        suggest(
          `为了改善${target}，我需要澄清哪一个核心需求或边界？`,
          "从同时解释所有矛盾，缩小为一次可以表达的需求。",
        ),
        suggest(
          `${time}，我可以为${target}尝试怎样的一次具体沟通？`,
          "将探索连接到一个可以准备、执行和复盘的行动。" + timeReason,
        ),
      ];
    } else if (/工资|薪酬|加薪/.test(q))
      suggestions = [
        suggest(
          "准备薪酬沟通时，我需要用哪些实际成果和岗位信息澄清自己的诉求？",
          "保留薪酬目标，将不可保证的结果换成可准备的依据。",
        ),
        suggest(
          "对于目前的薪酬期待，我需要认识哪些需求与可接受的条件？",
          "关注自己的判断标准，而不是推断决定者的内心。",
        ),
        suggest(
          `${time}，我可以怎样准备一次有事实依据的薪酬沟通？`,
          "给准备和复盘设定时间，不保证加薪发生。" + timeReason,
        ),
      ];
    else if (/离职|辞职|跳槽|转行|职业方向|换工作/.test(q))
      suggestions = [
        suggest(
          "在决定是否调整职业方向前，我需要核实哪些现实条件？",
          "保留职业选择的主题，不替你决定离职或留下。",
        ),
        suggest(
          "目前的职业选择分别满足了我哪些价值与需求？",
          "比较选项的意义和代价，而不是寻找绝对正确的命定答案。",
        ),
        suggest(
          `${time}，我可以用哪一次小规模调查或尝试检验职业方向？`,
          "把重大决定拆成可撤回的调查或试验。" + timeReason,
        ),
      ];
    else
      suggestions = [
        suggest(
          "目前工作中，哪一个具体困难最值得我先澄清？",
          "从整体事业结果缩小到一个可讨论的实际问题。",
        ),
        suggest(
          "面对这项工作任务，我有哪些资源或限制需要认识？",
          "让牌面线索帮助检查条件，不把它当作结果证据。",
        ),
        suggest(
          `${time}，我可以采取哪一个能被检查的工作改进行动？`,
          "回到自己的行动与反馈标准。" + timeReason,
        ),
      ];
  } else if (domainKey === "relationship") {
    const noResume =
      !complexNegation &&
      /不想复合|不愿复合|不打算复合|决定分手|保持分开/.test(q);
    const noContact =
      !complexNegation &&
      /不再联系|不想联系|不想主动联系|暂不联系|暂时不联系/.test(q);
    const separate = noResume || noContact;
    const boundary = noResume ? "不恢复关系" : "暂不主动联系";
    suggestions = separate
      ? [
          suggest(
            `在${boundary}的前提下，我有哪些需要照顾的感受与期待？`,
            "保留你提出的具体边界；暂不主动联系不等于必须结束关系。",
          ),
          suggest(
            "为了维护我已选择的关系边界，我需要辨认哪些现实触发情境？",
            "聚焦自己可以观察和准备的部分，不猜测对方后悔与否。",
          ),
          suggest(
            `${time}，我可以用哪一个具体行动支持自己的生活与关系边界？`,
            "行动用于照顾自己，不以改变对方心意为检验标准。" + timeReason,
          ),
        ]
      : [
          suggest(
            "我可以观察哪些实际互动，来理解这段关系目前的发展状态？",
            "保留关系背景，把“读心”改为可核实的互动线索。",
          ),
          suggest(
            "对于这段关系，我有哪些需要认识的期待与顾虑？",
            "把注意力放回自己的感受，不替不在场的人下结论。",
          ),
          suggest(
            `${time}，如果希望进一步了解彼此，我可以怎样主动沟通并尊重回应？`,
            "提供有边界的行动方向，是否发展仍需双方意愿与现实信息。" +
              timeReason,
          ),
        ];
  } else if (domainKey === "social") {
    const target = /家人|父母/.test(q)
      ? "与家人的相处"
      : /室友/.test(q)
        ? "与室友的相处"
        : /同学/.test(q)
          ? "与同学的互动"
          : /朋友/.test(q)
            ? "这段友谊"
            : "这次人际互动";
    suggestions = [
      suggest(
        `在${target}中，我最需要核实的一个事实或误会是什么？`,
        "保留人际情境，用可以确认的信息替代人格或动机判断。",
      ),
      suggest(
        `面对${target}的困难，我需要认识哪个需求或边界？`,
        "一次聚焦一个核心关注点，允许自己与他人有不同需要。",
      ),
      suggest(
        `${time}，我可以怎样为${target}准备一次具体而尊重边界的沟通？`,
        "将反思连接到行动；沟通的效果需要观察，不由牌面保证。" + timeReason,
      ),
    ];
  } else if (domainKey === "growth") {
    const target = /学习|考试|考研|考公|考上|备考|学业|技能/.test(q)
      ? "学习与准备"
      : /习惯|拖延|坚持|练习/.test(q)
        ? "日常习惯"
        : "个人成长";
    suggestions = [
      suggest(
        `在${target}上，哪一个具体困难最需要我先理解？`,
        "将笼统的自我评价改为一个情境中的困难。",
      ),
      suggest(
        `为了支持${target}，我已有的资源与仍需补足的条件分别是什么？`,
        "让对比服务同一个核心主题，不把牌面当作能力判决。",
      ),
      suggest(
        `${time}，我可以为${target}尝试哪一个小行动，并怎样检查它是否有帮助？`,
        "行动与复盘属于同一练习目标，不预设成绩或成长结果。" + timeReason,
      ),
    ];
  } else
    suggestions = [
      suggest(
        "围绕一个具体情境，我可以先确认哪些可观察的信息？",
        "这是通用框架；请把“具体情境”替换为你真实遇到的事。",
      ),
      suggest(
        "在我能够影响的范围内，当前最需要认识的需求或困难是什么？",
        "暂不猜测你的领域，由你补充背景和最关心的一个主题。",
      ),
      suggest(
        `${time}，我可以尝试哪一个能够检查结果的小行动？`,
        "用具体行动和复盘组织探索。" + timeReason,
      ),
    ];
  return { domain: names[domainKey], recognized, diagnostics, suggestions };
}
