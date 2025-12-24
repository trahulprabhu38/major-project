import torch
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer
)
from peft import LoraConfig, get_peft_model

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"
DATA_PATH = "data/jsonl/train.jsonl"

device = "mps" if torch.backends.mps.is_available() else "cpu"
print("Device:", device)

# -----------------------------
# LOAD DATASET
# -----------------------------
print("Loading dataset...")
dataset = load_dataset("json", data_files=DATA_PATH)
train_dataset = dataset["train"]

# -----------------------------
# TOKENIZER + MODEL
# -----------------------------
print("Loading tokenizer and model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float32,
    device_map=None
)
model.to(device)

# -----------------------------
# LORA CONFIG
# -----------------------------
print("Configuring LoRA...")

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05,
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# -----------------------------
# PREPROCESS FUNCTION
# -----------------------------
def preprocess(example):
    # Match the format used in train_lora_mac.py for consistency
    prompt = f"Generate 6 concise Course Outcomes (COs) from this module content:\n{example['instruction']}\n\nCOs:\n"
    text = prompt + example["output"]

    tokenized = tokenizer(
        text,
        truncation=True,
        padding="max_length",
        max_length=512
    )

    tokenized["labels"] = tokenized["input_ids"].copy()
    return tokenized

# -----------------------------
# MAP DATASET SAFELY
# -----------------------------
print("Tokenizing dataset...")

tokenized_dataset = train_dataset.map(
    preprocess,
    remove_columns=train_dataset.column_names
)

# -----------------------------
# TRAINING ARGS
# -----------------------------
training_args = TrainingArguments(
    output_dir="qwen_co_lora",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    num_train_epochs=3,
    logging_steps=10,
    save_strategy="epoch",
    fp16=False,  # MPS doesn't support fp16
    bf16=False,
    no_cuda=True,  # Use MPS instead
)

# -----------------------------
# TRAINER
# -----------------------------
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
)

print("Starting training...")
trainer.train()

# -----------------------------
# SAVE MODEL
# -----------------------------
model.save_pretrained("qwen_co_lora")
tokenizer.save_pretrained("qwen_co_lora")

print("Training completed successfully!")
