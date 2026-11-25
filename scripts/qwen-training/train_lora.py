#!/usr/bin/env python3
"""Optional *manual* PEFT/LoRA pilot for an approved Qwen checkpoint.

Not invoked by CI or Vercel and never deployed automatically. The small
40-example original seed is NOT sufficient evidence to ship new weights.
Requires a compatible, authorized GPU/Metal environment and dependencies.
No private client dialogues may enter this seed without separate informed consent.
"""
import argparse
import json
from pathlib import Path

SEED = Path(__file__).resolve().parents[2] / 'data/holistic-support/qwen-dialogue-sft-seed-v1.json'

def read_examples(path):
    source=json.loads(path.read_text(encoding='utf8'))
    rows=source['examples']
    ids=set()
    for row in rows:
        if row['id'] in ids:
            raise ValueError('duplicate row: '+row['id'])
        ids.add(row['id'])
        if row['locale'] not in ('en','ru') or row['role'] not in ('secretary','coach'):
            raise ValueError('Only approved RU/EN Secretary and Coach examples are allowed')
        if not row['user'].strip() or not row['assistant'].strip():
            raise ValueError('Empty example')
    return rows

def training_messages(row):
    locale=row['locale']; role=row['role']
    system=(f"You are the Holistic House AI using {role.title()} Mind for this turn. "
            f"Answer only in {'Russian' if locale=='ru' else 'English'}, kindly and concisely. "
            "Never invent actions or facts, diagnose, pressure, or ask multiple questions.")
    return [
        {'role':'system','content':system},
        {'role':'user','content':row['user']},
        {'role':'assistant','content':row['assistant']},
    ]

def main():
    parser = argparse.ArgumentParser(description='Qwen supervised LoRA *pilot* (not a production training release)')
    parser.add_argument('--model',default='Qwen/Qwen3-0.6B',help='Exact HF base checkpoint; validate identity against inference deployment')
    parser.add_argument('--seed',type=Path,default=SEED)
    parser.add_argument('--output',type=Path,default=Path('/tmp/hh-qwen-lora-pilot'))
    parser.add_argument('--pilot',action='store_true',help='Explicitly allow fewer than 200 reviewed examples for research only')
    parser.add_argument('--steps',type=int,default=60)
    args = parser.parse_args()
    rows = read_examples(args.seed)
    if len(rows)<200 and not args.pilot:
        parser.error(str(len(rows))+' reviewed seed examples: research pilot only. Use --pilot to run a non-production test.')
    if not 1<=args.steps<=500:
        parser.error('--steps must be 1..500')
    # Load optional heavy dependencies only AFTER offline validation.
    try:
        import torch
        from datasets import Dataset
        from peft import LoraConfig
        from trl import SFTConfig,SFTTrainer
    except ImportError as error:
        parser.error('Install reviewed versions of transformers, datasets, trl, peft, accelerate and torch on an approved machine: '+str(error))
    train = Dataset.from_list([{'messages':training_messages(row)} for row in rows])
    bf16 = bool(torch.cuda.is_available() and torch.cuda.is_bf16_supported())
    fp16 = bool(torch.cuda.is_available() and not bf16)
    config = SFTConfig(
        output_dir=str(args.output),max_length=1024,
        per_device_train_batch_size=1,gradient_accumulation_steps=8,
        max_steps=args.steps,learning_rate=1e-4,logging_steps=10,
        save_strategy='no',report_to='none',assistant_only_loss=True,
        bf16=bf16,fp16=fp16,
    )
    trainer = SFTTrainer(
        model=args.model,args=config,train_dataset=train,
        peft_config=LoraConfig(r=8,lora_alpha=16,lora_dropout=0.05,
            bias='none',task_type='CAUSAL_LM',target_modules='all-linear'),
    )
    trainer.train()
    trainer.save_model(str(args.output))
    (args.output/'PROVENANCE.json').write_text(json.dumps({
        'base_model':args.model,'seed_count':len(rows),'pilot':bool(args.pilot),
        'production_approved':False,'evaluation_status':'NOT_EVALUATED',
    },indent=2),encoding='utf8')
    print('PILOT ADAPTER ONLY: '+str(args.output)+'. Validate holdout + safety before any cloud publication.')

if __name__ == '__main__':
    main()
